# PAYLOAD ADMIN PANEL

## 1. Decision

Payload Admin remains the default management interface. Do not build a parallel custom CRUD admin.

## 2. Navigation & Appearance

### Visual Styling

- Typography: Vazirmatn Persian typography with a base size of 15px (`html { font-size: 15px; }`), standardized heading scale, and high-contrast WCAG AA styling.
- Spacing & Rhythm: Expanded table cell paddings (12px vertical / 16px horizontal), modern card borders, and clear elevation.
- RTL Navigation: Standardized sidebar navigation groups with clean chevron toggles and active state indicators:
  - **فراگیران و کلاس‌ها (Students & Classes)**: دانش‌آموزان (`students`), کلاس‌ها (`classes`), مدرسین (`teachers`), نواحی شهری (`neighborhoods`).
  - **رویدادها و پذیرش (Ceremonies & Reception)**: مراسم‌ها (`ceremonies`), سانس‌ها (`sessions`), دعوت‌ها (`invitations`), ثبت ورود مراسم‌ها (`session-checkins`).
  - **سیستم و دسترسی (System & Access)**: پیگیری‌ها (`follow-ups`), کاربران (`users`).

## 3. Custom UI Components in Admin

1. **`ClassStudents` (in Classes detail view)**:
   - Embedded React component inside the Class edit page.
   - Lists all students currently enrolled in the class with full name, phone numbers, neighborhood, and status badges.
2. **`DistrictClasses` & `DistrictStudents` (in Neighborhoods detail view)**:
   - Displays real-time lists of classes and students belonging to the specific urban district.
3. **Session Attendees Modal (in `AdvanceSession`)**:
   - Each session card in the Ceremony advance/telemetry view provides a "مشاهده حاضرین سانس" button.
   - Opens a fast modal with real-time attendee list and live search by name or phone.
4. **Session Filling State Auto-Reconciliation**:
   - Updating an existing session's status to `filling` automatically seals the previous filling session, respecting the database partial unique index without raising 422/409 errors.

## 4. Student Admin UX

Default list columns:

- full name (`lastName`, `firstName`);
- grade when known (`grade`);
- neighborhood (`neighborhood`, "ناحیه شهری");
- status (`status`, unified lifecycle badge);
- current Class (`currentClass`);
- updated time (`updatedAt`).

*(Native `attendedCeremonies` relationship field is hidden from the admin list and edit view to prevent layout clutter, as attendance history is rendered via dedicated check-in history components.)*

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
    - Row 1: `neighborhood` (50%, relation to neighborhoods / نواحی شهری), `referrer` (50%, referrer name)
    - Row 2: `address` (100%, detailed home address)
  - **گروه یادداشت‌ها و ملاحظات پرونده**:
    - `notes` (100%, case notes and important context)
  - **گروه سوابق پذیرش و حضور در مراسم‌ها**:
    - `checkins` (join on `session-checkins.student` showing ceremony, session, source, arrival time, and check-in user)
- **Tab 2: حلقه حیات و کلاس (Lifecycle & Class)**:
  - **گروه وضعیت پذیرش و انتساب کلاس**:
    - Row 1: `currentClass` (100%)
  - **گروه وضعیت چرخه عمر دانش‌آموز**:
    - Row 1: `status` (50%), `removedReason` (50%, conditional on removed)
  - **گروه گاه‌شمار و نقاط عطف چرخه عمر**:
    - Row 1: `referredAt` (33%, read-only via `JalaliDateField`), `absorbedAt` (33%, editable via `JalaliDateField` with local noon default), `stabilizedAt` (34%, read-only via `JalaliDateField`)

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
