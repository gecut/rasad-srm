# DOMAIN MODEL

## 1. Canonical vocabulary

### Student (`دانش‌آموز`)

The canonical person record. The former canonical term `Contact` is retired from product terminology and new code.

A Student may be incomplete when quickly created at reception. Missing details can be completed later.

### Teacher (`مدرس`)

A teaching domain entity connected to Classes. A Teacher may have an authenticated User account linked to the Teacher record for `/teacher`.

### Class (`کلاس`)

A stable teaching group with one primary Teacher and optional assistant Teachers. A Class is not school-grade-bound.

### Follow-up (`پیگیری`)

A timestamped operational note about a Student.

### Ceremony (`مراسم`)

An event container with one or more ordered Sessions.

### Session (`سانس`)

A dated/time-bounded ceremony slot. Sessions are not grade-targeted and have no capacity field in v2.

### Invitation (`دعوت`)

The ceremony-level processing state/result for one Student in one Ceremony. Only an accepted invitation is assigned to a Session.

### Check-in (`پذیرش / حضور`)

A record that a Student physically arrived for a Session. It exists independently from Invitation so walk-ins are supported.

### User (`کاربر`)

An authenticated identity. Roles include Admin-side and custom-panel roles.

## 2. Relationships

```text
User(teacher role) ── optional 1:1 ── Teacher
Teacher ── primary/assistant of ── Class
Class ── current class of ── Student
Student ── has many ── Follow-ups

Ceremony ── has many ordered ── Session
Ceremony ── has many ── Invitation ── for ── Student
Invitation(accepted) ── assigned to ── Session
Session ── has many ── Check-ins ── for ── Student
```

## 3. Core invariants

- A Student has at most one current Class.
- Operational Class assignment is manual.
- A primary Teacher can only operate on Students whose current Class is one of that Teacher's primary Classes.
- Student lifecycle never stores invitation outcome.
- Invitation outcome never changes Student lifecycle automatically.
- Sessions have no `grade` or `capacity` business field.
- Session fill order defaults to `startsAt ASC` within the Ceremony.
- Exactly one non-cancelled Session per Ceremony may be `filling`.
- An accepted Invitation is assigned to the Ceremony's current `filling` Session.
- Moving to the next Session is explicit because no Session capacity exists.
- A Student may be checked into a Session without any prior Invitation.
- A Student cannot have duplicate Check-ins for the same Session.

## 4. Intentional simplifications

Do not add without a concrete requirement:

- Student enrollment history;
- class membership history;
- guardian entities;
- generic CRM pipelines;
- invitation queue collection;
- capacity model for Sessions;
- grade eligibility rules for Sessions.
