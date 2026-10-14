# STATUS MODEL

Statuses are separated by domain concern.

## 1. Student Status

The student status is a single unified lifecycle model representing the student's current stage and eligibility:

| Value                 | Persian           | Meaning                                                                                              |
| --------------------- | ----------------- | ---------------------------------------------------------------------------------------------------- |
| `unknown`             | نامعلوم           | Grades 1-6 students not currently seeking class membership                                           |
| `waitlisted`          | پشت‌خطی           | Grades 1-3 students requesting class membership (holding for older grade admission)                  |
| `class_seeker`        | خواهان کلاس       | Grades 4-6 students actively requesting class membership and awaiting assignment                     |
| `referred_to_teacher` | به مدرس معرفی شده | Student introduced to a Class and its primary Teacher                                                |
| `absorbed`            | جذب شده           | Teacher confirmed attendance and active participation in the Class                                   |
| `stabilized`          | تثبیت‌شده         | Absorbed student maintaining uninterrupted participation after 6 months                              |
| `removed`             | حذف شده           | Student exited from the cycle at any stage (requires mandatory `removedReason`); not physical DB deletion |

### Lifecycle Transitions and Automations

- **Class Assignment Automation**: When a student with status `unknown`, `waitlisted`, or `class_seeker` is assigned a `currentClass`, the status automatically transitions to `referred_to_teacher`, and `referredAt` is stamped with the current timestamp.
- **Class Unassignment Automation**: When `currentClass` is cleared from a student in `referred_to_teacher`, the status automatically reverts to `waitlisted` for grades 1-3, or `class_seeker` for grades 4-6 (or remains `unknown` if grade is null), and `referredAt` is cleared.
- **Teacher Confirmation**: When a teacher confirms attendance, status moves to `absorbed` and `absorbedAt` is stamped automatically.
- **Stabilization Rule**: Transition to `stabilized` requires at least 6 months to have elapsed since `absorbedAt`, stamping `stabilizedAt`.
- **Exit and Reactivation**: Transition to `removed` requires a non-empty `removedReason`. Re-activating a removed student to a class-seeking state automatically clears `removedReason`.

## 3. Teacher status

- `active`
- `inactive`

## 4. Class status

| Value                         | Persian/meaning       |
| ----------------------------- | --------------------- |
| `planned`                     | برنامه‌ریزی‌شده       |
| `active`                      | فعال                  |
| `admissions_paused`           | توقف پذیرش/معرفی جدید |
| `transition_to_preliminaries` | انتقال به مقدمات      |
| `suspended`                   | تعلیق موقت            |
| `ended`                       | پایان‌یافته           |
| `cancelled`                   | لغوشده                |

`transition_to_preliminaries` is an operational label only in MVP; it has no automatic side effect until a workflow is explicitly defined.

## 5. Ceremony status

- `draft`
- `scheduled`
- `inviting`
- `active`
- `completed`
- `cancelled`

## 6. Session status

| Value       | Meaning                                        |
| ----------- | ---------------------------------------------- |
| `draft`     | not ready                                      |
| `queued`    | ready but waiting behind an earlier Session    |
| `filling`   | current Session receiving accepted Invitations |
| `sealed`    | no more accepted Invitations may be assigned   |
| `active`    | Session is executing                           |
| `completed` | execution finished                             |
| `cancelled` | cancelled                                      |

There is no `full` status because v2 intentionally has no Session capacity.

## 7. Invitation outcome

- `accepted` — successful, assigned to current filling Session
- `needs_alternative_session` — current Session is unsuitable; Student can re-enter only after Session advancement
- `no_answer_sms` — no successful call; SMS fallback required
- `failed` — unsuccessful, no SMS

## 8. SMS technical status

- `not_required`
- `queued`
- `sent`
- `failed`
