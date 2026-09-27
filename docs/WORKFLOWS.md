# WORKFLOWS

## W1 — Create / maintain Student

Employee creates or updates a Student in Payload Admin. Reception may create a minimal walk-in Student through its constrained workflow.

## W2 — Student becomes class seeker

Lifecycle → `class_seeker`.

## W3 — Refer Student to Class

1. authorized employee manually selects Class;
2. set `currentClass`;
3. set `referredAt`;
4. lifecycle → `referred_to_teacher`.

## W4 — Teacher reviews referral

1. primary Teacher logs into `/teacher` with phone + password;
2. selects one of their Classes;
3. sees referred Students;
4. marks a Student `absorbed` or `removed` according to allowed transitions.

On absorption, store `absorbedAt`.

## W5 — Follow-up / stabilization

Follow-up staff can append notes. After at least six months from `absorbedAt`, authorized staff may explicitly confirm `stabilized`.

## W6 — Create Ceremony and Sessions

1. create Ceremony in Admin;
2. create Sessions with full date/time;
3. enter/display scheduling in Jalali UI;
4. order Sessions by `startsAt`;
5. mark first ready Session `filling`, later ones `queued`.

## W7 — Invitation task loop

1. inviter authenticates to `/invite`;
2. selects/receives active Ceremony context;
3. server identifies Ceremony's current `filling` Session;
4. server claims the next eligible Student from ceremony-level queue;
5. UI shows Student and current Session context;
6. inviter calls using any available phone;
7. inviter submits one outcome;
8. server records result and releases claim;
9. UI advances immediately.

No grade matching and no capacity calculation occurs.

## W8 — Accepted invitation

1. re-read Ceremony/current filling Session;
2. verify claim and user role;
3. set Invitation outcome `accepted`;
4. set `assignedSession = current filling Session`;
5. append attempt history if enabled.

## W9 — Needs alternative Session

1. store `needs_alternative_session` with no assignment;
2. keep Student out while current Session remains `filling`;
3. when Session advances, Student becomes queue-eligible again.

## W10 — Advance to next Session

Authorized Admin/Employee executes `advanceCeremonySession`.
Current Session becomes `sealed`; next chronological `queued` Session becomes `filling` and receives `fillingStartedAt`.

## W11 — No answer + SMS

Persist result → queue SMS → continue immediately → update technical SMS status asynchronously.

## W12 — Reception check-in for invited Student

1. receptionist selects active Ceremony/Session context;
2. searches by Student name (and optionally phone);
3. result shows expected assigned Session if any;
4. receptionist confirms check-in;
5. create unique `session-checkin`.

## W13 — Unknown friend / walk-in

1. receptionist searches and finds no matching Student;
2. chooses `دانش‌آموز جدید`;
3. enters first + last name and any known details;
4. server creates Student with `origin = reception_walk_in`;
5. server creates Check-in for selected Session in the same business action;
6. UI returns to search.

## W14 — Re-entry/reset

Authorized staff may reset current lifecycle when operationally needed. Do not build a full historical case system solely for re-entry.
