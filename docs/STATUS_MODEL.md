# STATUS MODEL

Statuses are separated by domain concern.

## 1. Student lifecycle

| Value                 | Persian           | Meaning                                                                                   |
| --------------------- | ----------------- | ----------------------------------------------------------------------------------------- |
| `unknown`             | نامعلوم           | not yet classified                                                                        |
| `class_seeker`        | خواهان کلاس       | wants/needs a Class, but no active Teacher referral yet                                   |
| `referred_to_teacher` | به مدرس معرفی شده | current Class selected and Student handed to its primary Teacher                          |
| `absorbed`            | جذب شده           | Teacher/authorized operator confirms the Student has effectively entered the Class        |
| `stabilized`          | تثبیت‌شده         | longer-term stable participation confirmed under the stabilization rule                   |
| `removed`             | حذف شده           | current lifecycle intentionally ended; this is a business state, not physical DB deletion |

Primary path:

```text
unknown
  ↓
class_seeker
  ↓ [manual class referral]
referred_to_teacher
  ↓ [teacher/authorized confirmation]
absorbed
  ↓ [>= 6 months + authorized human confirmation]
stabilized
```

`removed` may be selected from active stages with a reason where required.

## 2. Student readiness

- `normal` — عادی
- `waitlisted` — پشت‌خطی

Readiness remains orthogonal to lifecycle.

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
