# BUSINESS RULES

This document is normative.

## 1. Student data

- `Student` replaces `Contact` as the canonical product concept.
- First name and last name are required.
- Grade and phones may be incomplete for reception-created walk-ins.
- Grade, when present, is 1–6 and is descriptive; it does not control ceremony Session eligibility.
- Invitation eligibility requires at least one callable phone number.

## 2. Student lifecycle

Canonical path:

`unknown → class_seeker → referred_to_teacher → absorbed → stabilized`

`removed` ends the current lifecycle without physically deleting the Student.

### Class referral

When an authorized employee refers a Student:

1. choose the Class manually;
2. set `currentClass`;
3. set `referredAt`;
4. lifecycle → `referred_to_teacher`.

### Absorption

The primary Teacher or another authorized role may confirm that a referred Student has effectively entered the Class:

1. set `absorbedAt`;
2. lifecycle → `absorbed`.

### Stabilization

Unless later changed explicitly, stabilization remains human-controlled and may occur only after at least six calendar months from `absorbedAt`.

## 3. Teacher scope

- A Teacher panel account is linked to exactly one Teacher profile in MVP.
- Teacher sees only Classes where they are `primaryTeacher`.
- Teacher sees Students whose `currentClass` belongs to those primary Classes.
- Teacher may perform only documented lifecycle transitions, not arbitrary Student CRUD.

## 4. Class rules

- Class selection is manual.
- One Student has at most one current Class.
- `transition_to_preliminaries` is a valid Class status.
- No automatic behavior is attached to that Class status in MVP.

## 5. Ceremony and Session rules

- A Ceremony contains one or more Sessions.
- Session date/time is stored as a real date-time instant; UI input/display is Jalali/Persian.
- Session order defaults to chronological `startsAt` order.
- Sessions have no target grade.
- Sessions have an optional nominal capacity for telemetry and operational tracking.
- Exactly one Session of a Ceremony may be `filling` at a time (enforced via database partial unique index).
- Accepted invitations are assigned to the selected open Session (defaults to current filling Session).
- Advancing from one Session to the next or reopening a sealed session is an explicit authorized action guided by live telemetry.

## 6. Ceremony invitation queue

A Student is eligible for the current Ceremony invitation queue when:

- lifecycle is not `removed`;
- at least one phone exists;
- Student has not already accepted that Ceremony;
- Student is not otherwise terminally completed for the Ceremony;
- if latest outcome is `no_answer`, the current filling Session started after that result was processed (so unanswered students get another chance on subsequent sessions);
- Student is not currently leased/claimed by another inviter (claimed using PostgreSQL `FOR UPDATE OF s SKIP LOCKED LIMIT 1`).

There is no grade filter.

The default queue is deterministic, not score-based:

1. Re-eligible `no_answer` Students after Session advancement;
2. Never-processed eligible Students;
3. Stable tie-breaker by Student creation/id.

## 7. Invitation outcomes

### `accepted`

- atomically verify the selected Session belongs to the Ceremony and is open for attendance;
- assign `assignedSession` to that Session;
- append/update invitation result;
- dispatch confirmation SMS to all valid registered phone numbers (student, father, mother);
- Student leaves the Ceremony queue permanently.

### `no_answer`

- do not send SMS;
- Student remains out of the queue while the current Session is filling;
- after Session advancement, Student becomes re-eligible automatically.

### `declined`

- student or family declines invitation;
- terminal for the current Ceremony.

### `postponed`

- caller reschedules call;
- student is snoozed until `postponedUntil` timestamp (e.g. 30m, 1h, 2h).

## 8. Sequential filling & operational telemetry

Session filling is controlled by explicit authorized actions:

- `advanceCeremonySession(ceremonyId)` seals current session and activates the next queued session. In-flight claims are retained with a grace period.
- `reopenCeremonySession(ceremonyId, sessionId)` allows authorized staff to reopen a previously sealed session if needed.

Payload Admin displays real-time capacity and check-in telemetry (`AdvanceSession.tsx`) to guide operators.

## 9. Reception/check-in

- Check-in is independent of invitation.
- An invited Student normally checks into their `assignedSession`.
- Reception may check a Student into a different Session if they physically arrive there and policy allows; attendance records reality and does not rewrite invitation history.
- For Ceremonies with `attendancePolicy: 'single'`, duplicate attendance across different sessions is blocked (409) and prompts an explicit staff exception override (`forceOverride: true`).
- Search results display phone numbers with labels, school grade, neighborhood name, and inline quick-edit capabilities.
- Unknown walk-ins may be created as Students and immediately checked in.
- Duplicate check-in for the same Student + Session is forbidden.

## 10. Walk-in creation & sibling tolerance

Minimum required input:

- first name;
- last name.

Optional fields captured on walk-in:

- school grade, neighborhood, address, phones (student, mother, father), referrer, notes, and class-seeker toggle.
- When existing phone numbers match a sibling or family member, receptionist can explicitly confirm «ثبت به عنوان دانش‌آموز جدید (عضو جدید خانواده)» (`allowSharedPhone: true`).
- The new Student is marked `origin = reception_walk_in`.

## 11. Passwords

Passwords are never stored plaintext. Payload auth handles password hashing. Custom-panel login is phone + password at the UI boundary.
