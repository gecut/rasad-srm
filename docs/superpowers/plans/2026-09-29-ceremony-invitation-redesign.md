# Ceremony, Invitation & Reception Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the ceremony, invitation, and reception subsystems to eliminate concurrency bottlenecks, support lock-free claims with `SKIP LOCKED`, enable flexible session selection and multi-attendance policies, tolerate shared phone numbers for siblings, provide reception quick-edit, and deliver rich live capacity telemetry across all panels.

**Architecture:** Replace the serialized PostgreSQL ceremony advisory locks with row-level atomic claiming using `FOR UPDATE SKIP LOCKED`. Elevate the domain model with ceremony `attendancePolicy`, session `capacity`, and refined invitation outcomes (`accepted`, `no_answer`, `declined`, `postponed`). Upgrade the React 19 / HeroUI v3 operational panels with student dossier context (past ceremony history, neighborhood, grade), live capacity badges, sibling walk-in registration, and an interactive ceremony management telemetry component in Payload Admin.

**Tech Stack:** Payload CMS 3.89, PostgreSQL 17, React 19, HeroUI v3, Tailwind CSS v4, TanStack Router, `@solar-icons/react` (linear family), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-ceremony-invitation-redesign-design.md`

## Global Constraints

- Monorepo structure: `packages/contracts` owns shared API types; `apps/cms` owns domain rules, collections, and Next/Payload server; `apps/panel` owns the Vite SPA.
- All panel UI must follow HeroUI v3 semantic components, Vazirmatn font with `font-display: swap`, WCAG AA contrast (minimum 4.5:1), and RTL-first layout.
- Icons must strictly use `@solar-icons/react` (`linear` family) via tree-shakable subpath imports (`@solar-icons/react/linear/<kebab-name>`); root barrel imports are banned.
- Server-side validation and database constraints are authoritative.
- Sessions in `filling` state must be strictly unique per ceremony via database partial unique index.

## Review Focus

1. **In-Flight Claim Protection:** When a session is advanced, active callers speaking with families must never have their claims deleted or cards wiped out.
2. **Sibling Phone Sharing:** Reception walk-in registration must never fail or block with a 409 conflict when two siblings share their parents' phone numbers.
3. **No-Answer Re-Queueing:** Students marked `no_answer` must not be sent an SMS and must re-enter the queue only when subsequent sessions become active.
4. **Multi-Phone SMS Dispatch:** When an invitation is accepted, confirmation SMS jobs must be enqueued to all valid mobile numbers of the student (`mobile`, `motherMobile`, `fatherMobile`).
5. **Multi-Attendance Policy Enforcement:** When a ceremony is in `single` attendance mode, reception check-in to a second session must be blocked with an explanatory notice detailing the student's previous arrival.

---

### Task 1: Shared API Contracts & Domain Types

**Files:**

- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/package.json` (build verification)

**Interfaces:**

- Produces:
  - `AttendancePolicy = 'single' | 'multiple'`
  - `InvitationOutcome = 'accepted' | 'no_answer' | 'declined' | 'postponed'`
  - `StudentCard`: extended with `neighborhood`, `grade`, `referrer`, `notes`, and `recentCheckins: { ceremonyTitle: string; sessionTitle: string; checkedInAt: string }[]`
  - `PanelSession`: extended with `capacity?: number | null`, `acceptedCount: number`, `checkedInCount: number`
  - `ReceptionStudent`: extended with `phones`, `neighborhoodName`, `address`, `notes`, `referrer`
  - `ReceptionQuickEditInput` and `WalkInRegistrationInput`

- [ ] **Step 1: Write contract definitions for updated invitation outcomes, student card, and reception types**

Add `AttendancePolicy`, updated `InvitationOutcome`, `recentCheckins` in `StudentCard`, `capacity` in `PanelSession`, and `ReceptionQuickEditInput` in `packages/contracts/src/index.ts`.

- [ ] **Step 2: Build contracts package and verify type exports**

Run: `pnpm --filter @rasad/contracts build`
Expected: PASS with `.d.ts` generated without errors.

- [ ] **Step 3: Commit contracts updates**

```bash
git add packages/contracts/src/index.ts
git commit -m "feat(contracts): update ceremony, invitation, and reception contracts"
```

---

### Task 2: Backend Collections Schema, Enum Updates & Migration

**Files:**

- Modify: `apps/cms/src/collections/Ceremonies.ts`
- Modify: `apps/cms/src/collections/Sessions.ts`
- Modify: `apps/cms/src/collections/Invitations.ts`
- Create: `apps/cms/src/migrations/20260929_160000_ceremony_invitation_redesign.ts`
- Modify: `apps/cms/src/migrations/index.ts`

**Interfaces:**

- Consumes: `AttendancePolicy`, `InvitationOutcome` from `@rasad/contracts`
- Produces: Database schema supporting `attendancePolicy`, session `capacity`, updated invitation outcomes, and partial unique index on filling sessions.

- [ ] **Step 1: Add `attendancePolicy` to `Ceremonies.ts`**

In `apps/cms/src/collections/Ceremonies.ts`, add field:

```typescript
{
  name: 'attendancePolicy',
  label: 'سیاست حضور در مراسم',
  type: 'select',
  required: true,
  defaultValue: 'single',
  options: [
    { label: 'یک‌باره (تک‌حضوری در کل مراسم)', value: 'single' },
    { label: 'چندباره (امکان حضور در چند سانس)', value: 'multiple' },
  ],
}
```

- [ ] **Step 2: Add `capacity` to `Sessions.ts`**

In `apps/cms/src/collections/Sessions.ts`, add field:

```typescript
{
  name: 'capacity',
  label: 'ظرفیت پیشنهادی',
  type: 'number',
  min: 1,
  admin: { description: 'حداکثر ظرفیت مدنظر جهت محاسبه درصد تکمیل و هشدارهای پرشدگی' },
}
```

- [ ] **Step 3: Update `outcome` options and add `postponedUntil` to `Invitations.ts`**

Update `outcome` select options: `['accepted', 'no_answer', 'declined', 'postponed']`. Add optional `postponedUntil: { name: 'postponedUntil', type: 'date' }`.

- [ ] **Step 4: Create migration with partial unique index**

Create migration `apps/cms/src/migrations/20260929_160000_ceremony_invitation_redesign.ts`:

- Add `attendance_policy` column to `ceremonies` with default `'single'`.
- Add `capacity` numeric column to `sessions`.
- Update `enum_invitations_outcome` type to include `'no_answer'`, `'declined'`, `'postponed'`.
- Add `postponed_until` timestamp to `invitations`.
- Add partial unique index:
  `CREATE UNIQUE INDEX "sessions_single_filling_idx" ON "sessions" ("ceremony_id") WHERE status = 'filling';`

- [ ] **Step 5: Run tests to verify schema integrity**

Run: `pnpm --filter cms test:int tests/int/ceremonies-sessions.int.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit collection changes and migration**

```bash
git add apps/cms/src/collections/ apps/cms/src/migrations/
git commit -m "feat(cms): add ceremony attendance policy, session capacity, and schema migration"
```

---

### Task 3: Lock-Free Atomic Claiming & Resilient Session Service

**Files:**

- Modify: `apps/cms/src/domain/invitations/invitationService.ts`
- Modify: `apps/cms/src/domain/ceremonies/sessionService.ts`
- Modify: `apps/cms/tests/int/invitations.int.spec.ts`
- Modify: `apps/cms/tests/int/invitation-concurrency.int.spec.ts`

**Interfaces:**

- Consumes: `@rasad/contracts`, `payload`
- Produces:
  - `getNextCeremonyInvite`: atomic claim via `FOR UPDATE SKIP LOCKED`, returns enriched `StudentCard` with past 2 ceremony check-ins and notes.
  - `submitInvitationOutcome`: accepts any chosen session from open ceremony sessions, queues SMS to all student phone numbers upon `accepted`.
  - `advanceCeremonySession`: preserves in-flight claims without mass deletion.

- [ ] **Step 1: Write integration test for lock-free concurrent claiming and in-flight claim retention during advance**

In `apps/cms/tests/int/invitation-concurrency.int.spec.ts`, test that:

1. Advancing a session does not delete existing claims.
2. An active claim on session 1 can submit its result to session 1 even after session 2 becomes `filling`.
3. Parallel callers claim unique students without advisory lock contention.

- [ ] **Step 2: Update `invitationService.ts` with row-level `SKIP LOCKED` query and student history**

Replace the global transaction advisory lock in `getNextCeremonyInvite`.
Select candidate using `FOR UPDATE OF s SKIP LOCKED LIMIT 1`.
Populate `recentCheckins` by querying student's last 2 records from `session-checkins`.
On `accepted`, enqueue `send-sms` task for all available student phone numbers (`mobile`, `motherMobile`, `fatherMobile`).
On `no_answer`, set outcome to `'no_answer'` and leave `assignedSession` null (no SMS queued).

- [ ] **Step 3: Update `advanceCeremonySession` in `sessionService.ts` to preserve active claims**

Remove `payload.delete({ collection: 'invitation-claims', where: { ceremony: { equals: ceremonyId } } })`.
Seals current session and activates next session safely.

- [ ] **Step 4: Run integration tests to verify tests pass**

Run: `pnpm --filter cms test:int tests/int/invitation-concurrency.int.spec.ts tests/int/invitations.int.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit service improvements**

```bash
git add apps/cms/src/domain/invitations/ apps/cms/src/domain/ceremonies/ apps/cms/tests/int/
git commit -m "feat(cms): lock-free claiming with SKIP LOCKED and safe session advancement"
```

---

### Task 4: Reception Quick-Edit, Shared Phone Tolerance & Multi-attendance Enforcement

**Files:**

- Modify: `apps/cms/src/domain/reception/receptionService.ts`
- Modify: `apps/cms/src/endpoints/panel.ts`
- Create: `apps/cms/tests/int/reception-redesign.int.spec.ts`

**Interfaces:**

- Produces:
  - `POST /api/panel/reception/student/update`: Quick-edit student details (phones, grade, neighborhood, address, notes, referrer).
  - Tolerant `quickCreateAndCheckInStudent`: Does not block sibling creation when phone numbers match an existing student.
  - Policy-aware `checkInStudent`: Enforces ceremony `attendancePolicy`.

- [ ] **Step 1: Write failing test for reception quick-edit and duplicate-phone sibling walk-in**

In `apps/cms/tests/int/reception-redesign.int.spec.ts`, test:

1. Quick editing a student's grade and phone updates the student dossier.
2. Creating a walk-in with an existing father's mobile succeeds and creates a separate student record.
3. Checking into a second session in a `single` attendance ceremony returns 409 with arrival details unless `forceOverride: true` is supplied.

- [ ] **Step 2: Implement `updateReceptionStudent` and tolerance in `receptionService.ts`**

1. Allow walk-in creation with shared phone without throwing 409 conflict when explicit `allowSharedPhone: true` is sent.
2. In `checkInStudent`, check whether the student has an existing check-in in any session of the same ceremony. If ceremony `attendancePolicy === 'single'` and checkin exists, throw 409 with `previousCheckin` details unless `forceOverride: true`.
3. Add `updateReceptionStudent` function to update student fields.

- [ ] **Step 3: Register endpoints in `apps/cms/src/endpoints/panel.ts`**

Register:

- `POST /panel/reception/student/update` -> `updateReceptionStudent`
- Pass `allowSharedPhone` and `forceOverride` flags to walkin and checkin endpoints.

- [ ] **Step 4: Run reception integration tests**

Run: `pnpm --filter cms test:int tests/int/reception-redesign.int.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit reception backend changes**

```bash
git add apps/cms/src/domain/reception/ apps/cms/src/endpoints/panel.ts apps/cms/tests/int/
git commit -m "feat(cms): reception quick-edit, sibling phone tolerance, and multi-attendance policy"
```

---

### Task 5: Invitation Panel Frontend Redesign (`apps/panel/src/features/invitation.tsx`)

**Files:**

- Modify: `apps/panel/src/features/invitation.tsx`
- Modify: `apps/panel/src/features/_invitation-timer.tsx`

**Interfaces:**

- Consumes: `@rasad/contracts`, `request` from `../lib/api`, HeroUI v3 components

- [ ] **Step 1: Build Rich Student Dossier Card**

Display student full name, grade badge, neighborhood name, and referrer.
Add a dedicated "سابقه حضور در مراسم‌ها" section rendering up to 2 past ceremony badges with session title and check-in date.

- [ ] **Step 2: Add Live Session Selector with Capacity Badges**

Render a selector or radio group of all open sessions in the ceremony:

- Show session title, startsAt in Jalali, and live capacity badge (`۱۲۰ / ۱۵۰`).
- Default selection is the active filling session.
- Allow caller to select an alternative session if requested by the family.

- [ ] **Step 3: Update Outcome Buttons & Hotkeys**

Update the 4 outcome buttons with semantic HeroUI variants and hotkeys 1-4:

1. `accepted`: «پذیرفت (ثبت در سانس انتخابی)» (Primary)
2. `no_answer`: «عدم پاسخ (تماس در دورهای بعدی)» (Outline)
3. `declined`: «انصراف / عدم تمایل» (Danger)
4. `postponed`: «تماس مجدد (تعویق)» (Secondary) — opens quick duration picker (30m, 1h, 2h).

- [ ] **Step 4: Update Refresh Button Copy**

Update action button label to «بروزرسانی ظرفیت و دریافت دانش‌آموز بعدی».

- [ ] **Step 5: Verify build & lint in panel**

Run: `pnpm --filter panel build`
Expected: PASS

- [ ] **Step 6: Commit invitation panel redesign**

```bash
git add apps/panel/src/features/invitation.tsx
git commit -m "feat(panel): rich dossier, session selector, and refined outcomes in invitation panel"
```

---

### Task 6: Reception Panel Frontend Redesign (`apps/panel/src/features/reception.tsx`)

**Files:**

- Modify: `apps/panel/src/features/reception.tsx`
- Modify: `apps/panel/src/features/_reception-row.tsx`

**Interfaces:**

- Consumes: `@rasad/contracts`, HeroUI v3 (`Modal`, `Button`, `Field`, `Card`, `Chip`)

- [ ] **Step 1: Enhance Search Result Row with Student Details & Quick-Edit Trigger**

In `_reception-row.tsx`:

- Render grade, neighborhood name, student/father/mother phones, and assigned session badge.
- Add a "ویرایش سریع" action button triggering the quick-edit modal.

- [ ] **Step 2: Create Quick-Edit Modal**

Build modal allowing instant inline editing of:

- Mobile, Mother Mobile, Father Mobile
- Grade (1-6 dropdown)
- Neighborhood (selector)
- Address, Referrer, Notes
  Saves via `POST /panel/reception/student/update` and updates local search state immediately.

- [ ] **Step 3: Enhance Walk-in Registration Modal with Full Fields & Sibling Tolerance**

Add neighborhood dropdown, home address, referrer, and "خواهان کلاس" toggle to walk-in modal.
When duplicate phone is detected, display soft preview of existing students, but provide an explicit button:
`ثبت به عنوان دانش‌آموز جدید (عضو جدید خانواده)`
which passes `allowSharedPhone: true`.

- [ ] **Step 4: Add Top Banner Session Capacity Counter & Multi-attendance Warning**

Display live attendee count and capacity percentage per session: `حاضرین: ۱۳۵ / ۱۵۰ (۹۰٪)`.
When checking in a student who attended an earlier session in a `single` ceremony, open an explanatory dialog showing previous attendance time with option for authorized staff to override.

- [ ] **Step 5: Verify build in panel**

Run: `pnpm --filter panel build`
Expected: PASS

- [ ] **Step 6: Commit reception panel redesign**

```bash
git add apps/panel/src/features/reception.tsx apps/panel/src/features/_reception-row.tsx
git commit -m "feat(panel): reception quick-edit, sibling tolerance, and capacity telemetry"
```

---

### Task 7: Admin Ceremony Telemetry Dashboard Component

**Files:**

- Modify: `apps/cms/src/components/AdvanceSession.tsx`

**Interfaces:**

- Consumes: `@payloadcms/ui`, `/api/panel/context`

- [ ] **Step 1: Replace Raw Button with Live Operational Dashboard**

In `AdvanceSession.tsx`:

- Fetch ceremony sessions with live accepted counts, check-in counts, and capacities.
- Render styled session cards displaying:
  - Session title & Jalali start time.
  - Status chip (`filling`, `queued`, `sealed`, `active`, `completed`).
  - Capacity progress bar showing fill ratio (`۱۲۰ / ۱۵۰`).
  - Action buttons: "پیشروی به این سانس", "بازگشایی مجدد (Reopen)".
- Provide confirmation modal with clear impact explanation.

- [ ] **Step 2: Verify CMS build**

Run: `pnpm --filter cms build`
Expected: PASS

- [ ] **Step 3: Commit Admin telemetry component**

```bash
git add apps/cms/src/components/AdvanceSession.tsx
git commit -m "feat(cms): interactive ceremony telemetry and session control dashboard"
```

---

### Task 8: Full Monorepo Verification & E2E Validation

**Files:**

- Run test suites across the repository.

- [ ] **Step 1: Run all backend integration tests**

Run: `pnpm --filter cms test:int`
Expected: All tests PASS.

- [ ] **Step 2: Run monorepo typecheck and build**

Run: `pnpm check && pnpm build`
Expected: PASS across all packages (`contracts`, `cms`, `panel`).

- [ ] **Step 3: Commit any final refinements**

```bash
git commit --allow-empty -m "chore: verify ceremony, invitation, and reception redesign"
```
