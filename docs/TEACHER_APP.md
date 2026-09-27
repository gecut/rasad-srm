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

Recommended structure:

- Class selector/cards if Teacher has multiple Classes;
- tabs/filters: `به مدرس معرفی شده`, `جذب شده`, optionally `حذف شده`;
- compact Student rows/cards;
- status action with confirmation.

## 5. Teacher-permitted transitions

MVP recommendation:

- `referred_to_teacher → absorbed`
- `referred_to_teacher → removed`
- `absorbed → removed` when operationally required

Teacher does not confirm `stabilized`; that remains an authorized follow-up/admin action under the six-month rule.

On `absorbed`, set `absorbedAt` if empty.

## 6. Security

Every query and mutation is server-scoped to the Teacher's primary Classes. Never trust class/student IDs supplied by the browser without revalidation.

## 7. Do not add

- generic Student editing;
- cross-Teacher roster browsing;
- Class management;
- invitation or reception functions;
- academic grading/attendance features.
