# DATA MODEL

Conceptual Payload collection model. Persian UI labels may differ from code identifiers.

## 1. `users`

Auth-enabled Payload collection for all authenticated identities.

| Field            | Type                    | Notes                                                                             |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------- |
| `name`           | text                    | display name                                                                      |
| `email`          | auth/email              | optional depending on role                                                        |
| `username`       | auth username           | normalized phone for custom-panel users                                           |
| `role`           | select                  | `admin`, `employee`, `follow_up_specialist`, `inviter`, `teacher`, `receptionist` |
| `teacherProfile` | relationship → teachers | required only for role `teacher`                                                  |
| `status`         | select                  | `active`, `inactive`                                                              |

Auth configuration uses username login with email login allowed for Admin-side users and email not globally required.

## 2. `students`

| Field             | Type                         | Notes                                                         |
| ----------------- | ---------------------------- | ------------------------------------------------------------- |
| `firstName`       | text                         | required                                                      |
| `lastName`        | text                         | required                                                      |
| `grade`           | select/number                | optional descriptive data, 1–6 when present                   |
| `mobile`          | text                         | optional                                                      |
| `motherMobile`    | text                         | optional                                                      |
| `fatherMobile`    | text                         | optional                                                      |
| `landline`        | text                         | optional home landline phone                                  |
| `neighborhood`    | relationship → neighborhoods | max one                                                       |
| `address`         | textarea                     | optional home address                                         |
| `referrer`        | text                         | optional referrer name/source                                 |
| `notes`           | textarea                     | optional dossier notes                                        |
| `checkins`        | join → session-checkins      | reverse navigation to all attended ceremonies/sessions        |
| `invitations`     | join → invitations           | reverse navigation to all ceremony invitation outcomes        |
| `lifecycleStatus` | select                       | see STATUS_MODEL                                              |
| `readinessStatus` | select                       | `normal`, `waitlisted`                                        |
| `currentClass`    | relationship → classes       | max one                                                       |
| `referredAt`      | date-time                    | nullable                                                      |
| `absorbedAt`      | date-time                    | nullable                                                      |
| `stabilizedAt`    | date-time                    | nullable                                                      |
| `removedReason`   | text/select                  | nullable; required by relevant workflow                       |
| `origin`          | select                       | `admin`, `reception_walk_in`, `import`, other approved source |

At least one phone is required for invitation eligibility, but not for walk-in creation.

## 3. `neighborhoods`

| Field          | Type                        | Notes                                                             |
| -------------- | --------------------------- | ----------------------------------------------------------------- |
| `name`         | text                        | required, unique, indexed neighborhood name (e.g. وکیل‌آباد)      |
| `description`  | textarea                    | optional description of the area                                  |
| `subDistricts` | array of `{ name: string }` | sub-areas, quarters, streets for fast lookup (e.g. هفت تیر، حافظ) |

## 4. `teachers`

| Field       | Type   |
| ----------- | ------ |
| `firstName` | text   |
| `lastName`  | text   |
| `mobile`    | text   |
| `status`    | select |

The auth account is linked from `users.teacherProfile`; do not duplicate passwords here.

## 5. `classes`

| Field               | Type                             |
| ------------------- | -------------------------------- |
| `title`             | text                             |
| `primaryTeacher`    | relationship → teachers          |
| `assistantTeachers` | has-many relationship → teachers |
| `capacity`          | number                           | informational only, if already useful to operations |
| `status`            | select                           | see STATUS_MODEL                                    |

Class capacity remains informational. This is unrelated to removed Session capacity.

## 6. `follow-ups`

- `student` → students
- `specialist` → users
- `note`
- Payload timestamps

## 7. `ceremonies`

| Field         | Type               |
| ------------- | ------------------ |
| `title`       | text               |
| `description` | textarea/rich text |
| `status`      | select             |

## 8. `sessions`

| Field              | Type                      | Notes                                                      |
| ------------------ | ------------------------- | ---------------------------------------------------------- |
| `ceremony`         | relationship → ceremonies | required                                                   |
| `title`            | text                      | optional human label                                       |
| `startsAt`         | date-time                 | required; stored as ISO instant                            |
| `endsAt`           | date-time                 | optional/required by implementation; if present > startsAt |
| `status`           | select                    | see STATUS_MODEL                                           |
| `fillingStartedAt` | date-time                 | set when Session becomes `filling`                         |

Removed from v1: `grade`, `capacity`, accepted/remaining capacity counters.

Default fill order is `startsAt ASC`.

## 9. `invitations`

One current ceremony-level invitation record per `student + ceremony`.

| Field              | Type                      | Notes                                                          |
| ------------------ | ------------------------- | -------------------------------------------------------------- |
| `student`          | relationship → students   | required                                                       |
| `ceremony`         | relationship → ceremonies | required                                                       |
| `outcome`          | select                    | latest/current outcome                                         |
| `assignedSession`  | relationship → sessions   | nullable; set only when `accepted`                             |
| `inviter`          | relationship → users      | latest processor                                               |
| `note`             | textarea                  | optional                                                       |
| `smsStatus`        | select                    | technical                                                      |
| `processedSession` | relationship → sessions   | immutable context for alternative-session eligibility          |
| `processedAt`      | date-time                 | latest processing time                                         |
| `attempts`         | JSON                      | optional embedded history: outcome, inviter, processedAt, note |

Unique business constraint: one Invitation document per Student + Ceremony. Reprocessing updates the document and may append to `attempts`.

`contactTarget` is removed.

## 10. `session-checkins`

| Field         | Type                    | Notes                |
| ------------- | ----------------------- | -------------------- |
| `student`     | relationship → students | required             |
| `session`     | relationship → sessions | required             |
| `checkedInBy` | relationship → users    | receptionist/admin   |
| `checkedInAt` | date-time               | required             |
| `source`      | select                  | `invited`, `walk_in` |
| `note`        | textarea                | optional             |

## 11. `invitation-claims`

Unique constraint: one Student + Session check-in.

Ceremony is derived from `session.ceremony` and should not be duplicated unless profiling/reporting later proves it necessary.

## 10. No persistent invitation queue collection

The queue is derived from Students, the selected Ceremony, its current filling Session, Invitations, and short-lived claim/lease state.
