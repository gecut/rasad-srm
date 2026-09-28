# PAYLOAD ADMIN PANEL

## 1. Decision

Payload Admin remains the default management interface. Do not build a parallel custom CRUD admin.

## 2. Navigation

### Students & Learning

- Students
- Teachers
- Classes
- Follow-ups

### Ceremonies

- Ceremonies
- Sessions
- Invitations
- Session Check-ins

### System

- Users

## 3. Student Admin UX

Default list columns:

- full name (`lastName`, `firstName`);
- grade when known (`grade`);
- neighborhood (`neighborhood`);
- lifecycle status (`lifecycleStatus`);
- readiness status (`readinessStatus`);
- current Class (`currentClass`);
- updated time (`updatedAt`).

Searchable fields in list view:
- `firstName`, `lastName`, `mobile`, `fatherMobile`, `motherMobile`, `landline`, `referrer`.

Edit form tabs structure:
- **Tab 1: مشخصات فردی و ارتباطی (Personal & Contact)**:
  - Row 1: `firstName` (33%), `lastName` (33%), `origin` (34%)
  - Row 2: `mobile` (33%), `fatherMobile` (33%), `motherMobile` (34%)
  - Row 3: `landline` (33%), `grade` (33%), `neighborhood` (34%)
  - Row 4: `referrer` (33%), `address` (67%)
  - Row 5: `notes`
  - Bottom Group: `checkins` (join on `session-checkins.student` showing session, source, arrival time, and check-in user)
- **Tab 2: حلقه حیات و کلاس (Lifecycle & Class)**:
  - Row 1: `readinessStatus` (50%), `currentClass` (50%)
  - Row 2: `lifecycleStatus` (50%), `removedReason` (50%, conditional on removed)
  - Row 3: `referredAt` (33%), `absorbedAt` (33%), `stabilizedAt` (34%)
  - Bottom Group: `invitations` (join on `invitations.student` showing ceremony, assigned session, outcome, and processed time)

Product label is `دانش‌آموزان`; do not expose `Contacts` in new UI copy.

## 4. Class UX

Class status includes `انتقال به مقدمات` (`transition_to_preliminaries`).

Do not add an automatic transition merely from selecting that status.

## 5. Ceremony / Session UX

- Session schedule input/display must be Jalali/Persian for operators.
- Persist an actual date-time instant (`startsAt`, optional `endsAt`) rather than a Jalali-formatted string.
- Time is part of the schedule, not a separate ambiguous text field.
- Session list should show chronological order and current fill status.
- Provide an explicit action to seal current Session and advance to the next.

## 6. Invitation UX in Admin

Invitation records are ceremony-centric.
Show:

- Student;
- Ceremony;
- current outcome;
- assigned Session if accepted;
- inviter;
- processed time;
- SMS technical status.

`contactTarget`, target grade, Session capacity, accepted count, and remaining capacity are not part of v2.

## 7. Check-in support

Session Check-ins are inspectable/filterable in Admin for support and reporting.

## 8. Customization rule

Use built-in Payload list/edit views first. Add custom components only where workflow friction is real—especially Jalali date/time input and explicit domain actions.
