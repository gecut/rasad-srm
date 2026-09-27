# ROLES AND PERMISSIONS

Security is server-side. Hiding UI is not authorization.

## 1. Admin

Surface: `/admin`.
Full operational and configuration authority.

## 2. Employee

Surface: `/admin`.
Operational CRUD, class referral, ceremonies/Sessions, invitation support, explicit Session advancement where permitted.

## 3. Follow-up Specialist

Surface: restricted `/admin`.
Read Student/Class/Teacher context, create Follow-ups, confirm stabilization, set removal where permitted.

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
- update only teacher-permitted lifecycle fields/transitions.

Must not:

- view other Teachers' Class rosters;
- change `currentClass`;
- edit phones/identity;
- access Admin.

## 6. Receptionist

Surface: `/reception` only.
May:

- search Students through a scoped endpoint;
- read invitation/assigned Session context needed for check-in;
- create a Check-in;
- create a minimal walk-in Student only through the quick-create action.

Must not browse/export the full Student bank or edit unrelated lifecycle/class data.

## 7. Collection baseline

| Collection       | Admin | Employee    | Follow-up               | Inviter        | Teacher          | Reception             |
| ---------------- | ----- | ----------- | ----------------------- | -------------- | ---------------- | --------------------- |
| users            | full  | limited     | own/basic               | own            | own              | own                   |
| students         | full  | operational | read + lifecycle subset | claimed read   | own-class scoped | search + quick-create |
| teachers         | full  | operational | read                    | no             | own              | no                    |
| classes          | full  | operational | read                    | no             | own primary      | no                    |
| follow-ups       | full  | operational | create/read             | no             | read if approved | no                    |
| ceremonies       | full  | operational | read                    | scoped         | no               | scoped                |
| sessions         | full  | operational | read                    | current scoped | no               | scoped                |
| invitations      | full  | support     | read                    | scoped process | no               | scoped read           |
| session-checkins | full  | operational | read                    | no             | no               | create/read scoped    |

All custom actions revalidate references and scope on the server.
