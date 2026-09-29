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
  - **گروه مشخصات هویتی و تحصیلی**:
    - Row 1: `firstName` (50%), `lastName` (50%)
    - Row 2: `grade` (50%, school grade 1-6), `origin` (50%, admin-only registration source)
  - **گروه شماره‌های تماس و ارتباط با خانواده**:
    - Row 1: `mobile` (50%, student), `landline` (50%, home landline)
    - Row 2: `fatherMobile` (50%, father), `motherMobile` (50%, mother)
  - **گروه محدوده سکونت، نشانی و معرف**:
    - Row 1: `neighborhood` (50%, relation to neighborhoods), `referrer` (50%, referrer name)
    - Row 2: `address` (100%, detailed home address)
  - **گروه یادداشت‌ها و ملاحظات پرونده**:
    - `notes` (100%, case notes and important context)
  - **گروه سوابق پذیرش در مراسم‌ها**:
    - `checkins` (join on `session-checkins.student` showing session, source, arrival time, and check-in user)
- **Tab 2: حلقه حیات و کلاس (Lifecycle & Class)**:
  - **گروه وضعیت پذیرش و انتساب کلاس**:
    - Row 1: `readinessStatus` (50%), `currentClass` (50%)
  - **گروه مراحل چرخه عمر دانش‌آموز**:
    - Row 1: `lifecycleStatus` (50%), `removedReason` (50%, conditional on removed)
  - **گروه گاه‌شمار و نقاط عطف چرخه عمر**:
    - Row 1: `referredAt` (33%, read-only via `JalaliDateField`), `absorbedAt` (33%, editable via `JalaliDateField` with local noon default), `stabilizedAt` (34%, read-only via `JalaliDateField`)
  - **گروه سوابق دعوت به مراسم‌ها**:
    - `invitations` (join on `invitations.student` showing ceremony, assigned session, outcome, and processed time)

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
