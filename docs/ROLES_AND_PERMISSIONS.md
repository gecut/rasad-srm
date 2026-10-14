# ROLES AND PERMISSIONS

Security is server-side. Hiding UI is not authorization.

## 1. Admin

Surface: `/admin`.
Full operational and configuration authority.

## 2. Employee

Surface: `/admin`.
Strictly read-only access across all collections and management surfaces. Employee can view, search, and inspect records without permission to create, modify, or delete data.

## 3. Follow-up Specialist (Removed)

Role removed and consolidated into Employee. Follow-up history remains visible to staff, while follow-up mutations are restricted to Administrator.

## 4. Inviter

Surface: `/invite` only.
May receive claimed queue item, view necessary phone data, submit invitation outcome, and view current Ceremony/Session context.
Must not browse/edit arbitrary Students or select arbitrary Session assignment.

## 5. Teacher

Surface: `/teacher` only.
May:

- read own Teacher profile;
- read Classes where `primaryTeacher == teacherProfile`;
- read Students whose `currentClass` is one of those Classes;
- edit student dossier and contact details (first/last name, phones, address, neighborhood, notes);
- update student status between allowed transitions (`referred_to_teacher` → `absorbed` / `removed`, `absorbed` → `removed`).

Must not:

- view other Teachers' Class rosters;
- change or reassign `currentClass` (strictly locked);
- access Admin.

## 6. Receptionist

Surface: `/reception` only.
May:

- search Students through a scoped endpoint;
- read invitation/assigned Session context needed for check-in;
- create a Check-in;
- view attendee lists for current ceremony and session;
- create a minimal walk-in Student only through the quick-create action.

Must not browse/export the full Student bank or edit unrelated lifecycle/class data.

## 7. Collection baseline

| Collection       | Admin | Employee  | Inviter        | Teacher               | Reception             |
| ---------------- | ----- | --------- | -------------- | --------------------- | --------------------- |
| users            | full  | read-only | own            | own                   | own                   |
| students         | full  | read-only | claimed read   | own-class edit/status | search + quick-create |
| teachers         | full  | read-only | no             | own                   | no                    |
| classes          | full  | read-only | no             | own primary           | no                    |
| follow-ups       | full  | read-only | no             | no                    | no                    |
| ceremonies       | full  | read-only | scoped         | no                    | scoped                |
| sessions         | full  | read-only | current scoped | no                    | scoped                |
| invitations      | full  | read-only | scoped process | no                    | scoped read           |
| session-checkins | full  | read-only | no             | no                    | create/read scoped    |
| neighborhoods    | full  | read-only | no             | no                    | no                    |

All custom actions revalidate references and scope on the server.
