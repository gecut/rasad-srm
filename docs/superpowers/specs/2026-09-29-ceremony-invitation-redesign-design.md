# Design Spec: Ceremony, Invitation & Reception Architecture Redesign

## 1. Overview & Context

Rasad SRM manages ceremonies, sequential invitation workflows, and physical reception check-ins.
Following comprehensive architectural auditing and operational requirements review, several critical concurrency, data model, and UX friction points have been identified:

1. **Concurrency Serialization & Lock Contention:** The coarse-grained transaction lock `pg_advisory_xact_lock('ceremony:X')` on candidate claims and outcome submissions completely serializes all call-center operators, causing head-of-line blocking and connection pool exhaustion.
2. **In-Flight Claim Annihilation on Session Advancement:** When an operator or administrator advances a session (`advanceCeremonySession`), all active claims are deleted, wiping out the active caller's card while they are on the phone with a family.
3. **Regex Table Scans on Students:** Claim queries run three regex evaluations without indexes across the entire `students` table within an exclusive transaction lock.
4. **Caller Blindness & Rigid Outcomes:** Inviter card lacks past attendance history, neighborhood, grade, and referrer. Callers had no way to assign families to alternative sessions directly when requested, and "no-answer" permanently terminated students from the ceremony.
5. **Reception Friction & Duplicate Phone Blocking:** Sibling walk-ins sharing parents' mobile numbers were blocked by duplicate 409 conflict checks, quick-edit was missing, and session capacity metrics were absent.

This design specification establishes the new architecture, schema contracts, concurrency model, and UX flows for Ceremonies, Invitations, and Reception.

---

## 2. Core Decisions & Domain Rules

### 2.1. Concurrency: Lock-Free Atomic Claiming via `FOR UPDATE SKIP LOCKED`

- Replace ceremony-level coarse-grained advisory transaction locks (`pg_advisory_xact_lock`) with PostgreSQL row-level locks on candidate selection:
  ```sql
  SELECT s.id
  FROM students s
  ...
  FOR UPDATE OF s SKIP LOCKED
  LIMIT 1;
  ```
- Concurrent callers never block each other. Each caller atomically claims the next free student without holding up other callers or outcome submissions.

### 2.2. Safe Session Advancement with Grace Periods

- Session advancement seals the current session and activates the next queued session.
- **In-flight claims are NOT deleted.** Callers currently speaking with a student retain their 5-minute lease and can register the student into their agreed session without losing their work or seeing their card abruptly vanish.

### 2.3. Multi-Attendance Policy per Ceremony (`attendancePolicy`)

- Each ceremony defines `attendancePolicy`: `'single'` (default) or `'multiple'`.
- In `'single'` mode:
  - Students who have already checked into one session of the ceremony cannot check into another session (reception displays an explanatory modal with previous arrival timestamp and optional admin override).
  - Accepted students are permanently excluded from further invitation calling for that ceremony.
- In `'multiple'` mode:
  - Students may attend multiple sessions (e.g., educational workshops spanning different days).

### 2.4. Session Capacity & Fill Telemetry

- Each session gains an optional `capacity: number` field (informational / target).
- The system calculates and exposes live metrics:
  - `acceptedCount`: Number of accepted invitations assigned to the session.
  - `checkedInCount`: Number of physical check-ins recorded for the session.
  - `fillRatio`: Percentage of capacity reached.
- Colors and badges transition: `normal` (< 80%), `warning` (80–99%), `full` (>= 100%).

### 2.5. Flexible Session Selection on Acceptance

- The default filling session is pre-selected.
- Callers see all open/available sessions of the ceremony with live capacity badges.
- If a family requests a different session (e.g. Friday afternoon instead of Thursday evening), the caller can directly choose that session and click "پذیرفت (ثبت در این سانس)", removing the obsolete `needs_alternative_session` state.

### 2.6. No-Answer Re-Queueing (No SMS, Re-enter on Subsequent Sessions)

- Outcome `'no_answer'` replaces `'no_answer_sms'`. No SMS is sent on missed call.
- The student is paused for the current session, but automatically becomes eligible again when the ceremony moves to subsequent sessions.

### 2.7. Multi-Recipient Confirmation SMS on Acceptance

- Upon `'accepted'` outcome, the confirmation SMS job is enqueued to **all valid mobile numbers** registered for the student (`mobile`, `motherMobile`, `fatherMobile`).

### 2.8. Sibling & Shared Phone Tolerance in Reception

- Phone numbers in `students` are non-unique.
- During walk-in creation in Reception, matching phone numbers trigger an informative soft warning showing existing family members, but provide an explicit button: _"ثبت به عنوان دانش‌آموز جدید (عضو جدید خانواده)"_, ensuring registration is never blocked.

---

## 3. Data Model & Schema Changes

### 3.1. `ceremonies` Collection

Add field:

- `attendancePolicy`: `select`, options: `[{ label: 'یک‌باره (تک‌حضوری)', value: 'single' }, { label: 'چندباره (حضور در چند سانس)', value: 'multiple' }]`, default: `'single'`, required: true.

### 3.2. `sessions` Collection

Add fields & constraints:

- `capacity`: `number`, optional, min: 1, label: 'ظرفیت پیشنهادی'.
- Database constraint in migration:
  `CREATE UNIQUE INDEX "sessions_single_filling_idx" ON "sessions" ("ceremony_id") WHERE status = 'filling';`

### 3.3. `invitations` Collection

Update `outcome` enum:

- `options`:
  - `'accepted'` — پذیرفت (ثبت در سانس)
  - `'no_answer'` — عدم پاسخ (تماس در سانس‌های بعدی)
  - `'declined'` — انصراف / عدم تمایل
  - `'postponed'` — تعویق / تماس مجدد
- Add `postponedUntil`: `date`, optional.
- `attempts`: JSON array storing history: `[{ outcome, inviter, processedAt, session, note }]`.

### 3.4. `students` Collection & Phone Indexing

- Ensure `hasCallablePhone` or indexed phone columns (`mobile`, `motherMobile`, `fatherMobile`) support rapid btree lookups.
- Remove phone conflict blocks in `receptionService.ts`.

---

## 4. Operational Panels Design

### 4.1. Invitation Panel (`/invite`)

- **Student Dossier Header:**
  - Name, Grade, Neighborhood, Referrer.
  - **Recent Attendance Badge:** Last 2 attended ceremonies with session titles and arrival dates.
  - Case notes / previous caller notes.
- **Session Selector:**
  - Displays all open sessions with time and live capacity chips (`۱۲۰ / ۱۵۰`).
  - Preselects the active `filling` session.
- **Action Buttons & Hotkeys:**
  - `1`: پذیرفت (ثبت در سانس انتخابی) — triggers multi-phone SMS.
  - `2`: عدم پاسخ (تماس در سانس‌های بعدی).
  - `3`: انصراف / عدم تمایل.
  - `4`: تماس مجدد (تعویق) — modal/popover to pick 30m, 1h, 2h.
- **Status Refresh Button:** Labeled "بروزرسانی ظرفیت و دریافت دانش‌آموز بعدی".

### 4.2. Reception Panel (`/reception`)

- **Quick Edit Modal:**
  - Accessible directly from each search result row.
  - Allows editing phone numbers, grade, neighborhood, address, and notes inline.
- **Complete Walk-in Registration:**
  - Modal form captures: First Name, Last Name, Grade, Mobile, Mother Mobile, Father Mobile, Neighborhood (dropdown), Address, Referrer, and Class Seeker status (`class_seeker`).
  - Shared phone numbers show soft warning with "ثبت عضو جدید خانواده" override.
- **Multi-attendance Enforcement:**
  - If ceremony is `single` and student already checked in, displays warning modal with arrival history.

### 4.3. Payload Admin Panel

- **Interactive Ceremony Telemetry Component:**
  - Replaces raw `AdvanceSession.tsx` button with a comprehensive management dashboard:
    - Live card per session: Status, StartsAt, Capacity, Accepted Count, Check-in Count, Fill Rate progress bar.
    - Actions: "پیشروی به این سانس", "بازگشایی مجدد (Reopen)".
