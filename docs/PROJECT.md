# PROJECT — Rasad SRM v2

## 1. Product identity

**Rasad SRM** is an internal Student Relationship Management system.

It centralizes:

- the Student bank;
- class demand/referral and teacher confirmation;
- follow-up and stabilization;
- ceremonies and ordered Sessions;
- invitation work that fills Sessions sequentially;
- ceremony reception/check-in, including walk-ins.

The product is intentionally narrower than a general CRM, SIS, LMS, or full attendance platform.

## 2. Product surfaces

### Payload Admin `/admin`

Used for management, configuration, CRUD, filters, support, and operational oversight.

### Invitation Panel `/invite`

Used by inviters for a ceremony-wide queue. The system owns which Session is currently being filled.

### Teacher Panel `/teacher`

Used by a primary Teacher to see their Classes and Students referred to those Classes, then record permitted lifecycle decisions.

### Reception Panel `/reception`

Used at ceremonies to search a Student, check them into their Session, or quickly create an unknown walk-in Student and check them in.

## 3. Product principles

1. **Payload-first** for management workflows.
2. **Task panels only for repetitive role-specific work.**
3. **One canonical Student record.**
4. **Current operational truth over exhaustive history.**
5. **Human-controlled class referral.**
6. **Ceremony-centric invitations.**
7. **Sequential Session filling without grade segmentation.**
8. **Attendance is independent from invitation.**
9. **Security rules live on the server.**

## 4. Scope

In scope:

- users and roles;
- Students and phone data;
- school grade as descriptive Student data;
- lifecycle and readiness;
- Teachers and Classes;
- manual class referral;
- follow-up notes;
- ceremonies and ordered Sessions;
- invitation queue and outcomes;
- SMS fallback;
- Session assignment on accepted invitation;
- teacher portal;
- reception/search/check-in;
- quick walk-in Student creation;
- Jalali date/time presentation for ceremony scheduling.

Out of scope unless explicitly added:

- automated class recommendation;
- generic workflow/rule engine;
- full academic records;
- class membership history;
- parent/guardian entity model;
- complete daily attendance system for Classes;
- smart invitation ranking/scoring;
- automatic Session advancement based on hidden capacity.
