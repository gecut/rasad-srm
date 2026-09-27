# DECISIONS — v2

Compact accepted decision log. v2 supersedes conflicting v1 decisions.

## D001 — Product is Rasad SRM

Accepted. Internal Student Relationship Management system.

## D002 — Payload Admin remains default management surface

Accepted.

## D003 — Three approved custom task panels

Accepted: `/invite`, `/teacher`, `/reception`.

## D004 — Custom-panel stack

Accepted: React 19+, HeroUI v3, Tailwind CSS v4, RTL-first.

## D005 — Canonical person concept is Student

Accepted. `Contact` is retired from new product terminology/code. Existing data/code may require migration from `contacts` to `students`.

## D006 — Teacher can authenticate without becoming the Teacher entity itself

Accepted. Teacher remains a domain record. A User with role `teacher` links to one Teacher profile.

## D007 — One auth collection

Accepted. Admin and custom-panel identities share auth-enabled `users`.

## D008 — Phone + password login for custom panels

Accepted. UI uses phone number. Backend uses normalized auth username. Email is not required for these roles.

## D009 — Plaintext passwords are rejected

Accepted. Payload's built-in password hashing/session mechanisms are used even in MVP.

## D010 — Student lifecycle labels change

Accepted: `class_seeker`, `referred_to_teacher`, `absorbed`, `removed`; `stabilized` remains the later stable state.

## D011 — `removed` is logical, not physical deletion

Accepted.

## D012 — Class status adds `transition_to_preliminaries`

Accepted. No automatic side effect in MVP.

## D013 — Ceremony Sessions are not grade-targeted

Accepted. Remove Session grade eligibility.

## D014 — Session capacity is removed

Accepted. No `capacity`, accepted-count, remaining-capacity, or `full` status for Sessions.

## D015 — Sessions fill sequentially

Accepted. Exactly one Session per Ceremony is `filling`; accepted Invitations are assigned to it.

## D016 — Session advancement is explicit

Accepted. With no capacity, an authorized human seals the current Session and advances to the next chronological Session.

## D017 — Invitation is ceremony-centric

Accepted. Invitation is one Student + Ceremony operational record. `assignedSession` is set only on accepted outcome.

## D018 — Invitation contact target is removed

Accepted. The system does not persist whether Student/mother/father phone was called.

## D019 — Alternative-Session outcome requeues after Session advancement

Accepted. `needs_alternative_session` has no Session assignment and becomes eligible when a later Session starts filling.

## D020 — Invitation queue remains derived

Accepted. No persistent business queue collection.

## D021 — Queue is deterministic, not smart-ranked

Accepted. Use explicit deterministic ordering; do not introduce opaque scoring without a new requirement.

## D022 — Ceremony Session date/time is Jalali in UI, standard instant in storage

Accepted. Time is part of the schedule.

## D023 — Reception attendance is independent from Invitation

Accepted. Add `session-checkins` so invited and walk-in Students can both attend.

## D024 — Reception can quick-create walk-ins

Accepted. Minimum first + last name, then immediate Check-in.

## D025 — Stabilization rule retained unless explicitly changed

Accepted baseline: `absorbed → stabilized` requires at least six months + authorized human confirmation.

## D026 — In-place pnpm monorepo (2026-09-24)

Accepted. `apps/cms` retains Payload/Next, PostgreSQL, auth, domain rules and jobs. `apps/panel` is one Vite React 19 SPA for all three operational panels, using TanStack Router file-based routing, HeroUI v3, Tailwind v4 and the Payload REST SDK. `packages/contracts` owns generated/public API types only. Same-origin production routing is preferred. This supersedes the single Next application architecture. Mechanical relocation and its checks precede domain migration.

## D027 — PostgreSQL transactions and deterministic migration

PostgreSQL is the existing adapter. Ceremony-scoped advisory transaction locks serialize claims, outcomes and advancement. Compound unique indexes protect invitations/claims/check-ins; a migration adds the one-filling-session partial index. Claims last five minutes. No-answer/SMS is terminal for the ceremony in MVP. Migration archives v1 rows; conflicting accepted Sessions or pending SMS jobs stop migration. Earliest old open Session becomes filling; later open Sessions become queued.

## D028 — Jalali and operational boundaries

Use React-independent `@internationalized/date` PersianCalendar for Admin date/time input, Tehran timezone, ISO instants. Six months means six calendar months (UTC date arithmetic, end-of-month clamped). Reception records actual selected Session despite a different invitation assignment. Removal reason is required free text. Only follow-up specialist/Admin confirm stabilization; Teacher may absorb or remove own referred students and remove absorbed students.

## D029 — SMS delivery configuration

Mock provider remains available for tests/demo. Production without a configured provider must fail delivery rather than pretend a message was sent. `RUN_JOBS=true` enables the Payload minute worker; run one worker replica. Real SMS provider credentials/implementation are external follow-up, not assumed available.

## D030 — Explicit development seed through Payload CLI

Use Payload 3.89 `config.bin` to register `payload seed`, exposed as root `pnpm seed:dev`. The CLI owns environment/TypeScript loading; the existing trusted Local API fixture transaction owns synthetic data, idempotency and validation. Disable schema push and automatic jobs for this command before initialization, retain local development database guards and explicit nonzero failure exits. Development fixtures run on operator request, independently from application startup and production migrations.

## D031 — Separate GHCR images for CMS and Panel

Build CMS and Panel independently from the monorepo root context and publish `linux/amd64` images after quality checks on `main` and `v*` pushes. Both images use the same immutable commit SHA tag; production Compose pulls that matching pair. CMS production migrations run with one replica before Panel startup or further CMS scaling. Production secrets and database URLs enter only at runtime.
