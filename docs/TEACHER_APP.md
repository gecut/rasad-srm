# TEACHER PANEL — `/teacher`

## 1. Purpose

Give the primary Teacher the smallest UI needed to review Students referred to their Classes and record a Teacher-owned outcome.

## 2. Authentication

- phone number + password;
- role must be `teacher`;
- `user.teacherProfile` must reference an active Teacher.

## 3. Scope

The Teacher sees only Classes where:

`class.primaryTeacher == user.teacherProfile`

For those Classes, show Students where:

`student.currentClass == class.id`

## 4. Main UI

Structure:

- Class selector/cards if Teacher has multiple Classes;
- tabs/filters: `به مدرس معرفی شده`, `جذب شده`, `حذف شده`;
- compact Student rows/cards with status badges;
- quick status transition actions (`جذب دانش‌آموز`, `حذف از کلاس`);
- Student Profile Edit modal ("ویرایش اطلاعات دانش‌آموز"): allows teachers to view, correct, and complete all student contact, address, urban district (neighborhood), and notes fields directly.

## 5. Teacher-permitted mutations

1. **Student Profile Updates** (`/api/panel/teacher/student/update`):
   - First name, last name, grade (1-6);
   - Student mobile, father mobile, mother mobile, landline;
   - Address, neighborhood, notes;
   - `currentClass` is read-only and strictly locked (cannot be reassigned or cleared by teachers).

2. **Status Transitions** (`/api/panel/teacher/student`):
   - `referred_to_teacher → absorbed` (auto-stamps `absorbedAt`)
   - `referred_to_teacher → removed` (requires mandatory reason)
   - `absorbed → removed` (requires mandatory reason)

Teacher does not confirm `stabilized`; that remains an authorized staff/admin action under the six-month rule.

## 6. Security

Every query and mutation is server-scoped to the Teacher's primary Classes. Never trust class/student IDs supplied by the browser without revalidation.

## 7. Do not add

- changing or reassigning `currentClass`;
- cross-Teacher roster browsing;
- Class creation or class management;
- invitation or reception functions;
- academic grading/attendance tracking features.
