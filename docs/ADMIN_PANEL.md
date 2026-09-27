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

- full name;
- grade when known;
- lifecycle;
- readiness;
- current Class;
- updated time.

Filters should prioritize lifecycle, readiness, current Class, grade, and origin.

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
