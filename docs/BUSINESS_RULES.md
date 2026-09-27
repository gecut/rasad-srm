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
- Sessions have no capacity.
- Exactly one Session of a Ceremony may be `filling`.
- Accepted invitations are always assigned to that current filling Session.
- Because no capacity exists, an authorized operator explicitly seals the current Session and advances to the next Session.

## 6. Ceremony invitation queue

A Student is eligible for the current Ceremony invitation queue when:

- lifecycle is not `removed`;
- at least one phone exists;
- Student has not already accepted that Ceremony;
- Student is not otherwise terminally completed for the Ceremony;
- if latest outcome is `needs_alternative_session`, the current filling Session started after that result was processed;
- Student is not currently leased/claimed by another inviter.

There is no grade filter.

The default queue is deterministic, not score-based. Recommended MVP order:

1. re-eligible `needs_alternative_session` Students after Session advancement;
2. never-processed eligible Students;
3. stable tie-breaker by Student creation/id.

Do not add opaque scoring. If the business later defines priority, document it explicitly.

## 7. Invitation outcomes

### `accepted`

- atomically verify the Ceremony still has the same current `filling` Session;
- assign `assignedSession` to that Session;
- append/update invitation result;
- Student leaves the Ceremony queue permanently.

### `needs_alternative_session`

- do not assign a Session;
- Student remains out of the queue while the same Session is filling;
- after Session advancement, Student becomes eligible again.

### `no_answer_sms`

- persist result first;
- queue SMS;
- do not block inviter on provider response. This result is terminal for the Ceremony in MVP.

### `failed`

- terminal for the current Ceremony in MVP unless product owner later changes the rule.

## 8. Sequential filling

Session filling is controlled by one explicit action:

`advanceCeremonySession(ceremonyId)`

The action:

1. authorizes Admin/Employee;
2. loads current filling Session;
3. seals it;
4. selects next chronological queued Session;
5. marks it `filling` and stores `fillingStartedAt`;
6. commits atomically where supported.

This replaces capacity-based automatic advancement.

## 9. Reception/check-in

- Check-in is independent of invitation.
- An invited Student normally checks into their `assignedSession`.
- Reception may check a Student into a different Session if they physically arrive there and policy allows; attendance records reality and does not rewrite invitation history.
- Unknown walk-ins may be quickly created as Students and immediately checked in.
- Duplicate check-in for the same Student + Session is forbidden.

## 10. Quick walk-in creation

Minimum required input:

- first name;
- last name.

Grade and phones are captured when known but do not block check-in. The new Student is marked `origin = reception_walk_in`.

## 11. Passwords

Passwords are never stored plaintext. Payload auth handles password hashing. Custom-panel login is phone + password at the UI boundary.
