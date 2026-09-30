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

Build CMS and Panel independently from the monorepo root context and publish `linux/amd64` images after quality checks on `main` and `v*` pushes. A migration target from the CMS Dockerfile is published with the same commit SHA tag. Production Compose runs migration as a one-off service before starting CMS and Panel. Production secrets and database URLs enter only at runtime.

## D032 — Dokploy Compose production topology

Run PostgreSQL 17, a one-off migration service, CMS and Panel in one Dokploy Docker Compose stack. Persist PostgreSQL on a stable named volume; no current CMS collection needs a media volume. Only Panel joins `dokploy-network` for Dokploy Domains routing on internal port 80. PostgreSQL, migration and CMS remain on the private stack network without host ports. CMS starts only after migration succeeds. Keep one CMS replica for the optional job runner; restore existing production data into the volume before switching from an external database.

## D033 — Direct Panel API connection, NGINX-SPA serving, and operational role boundary

Deploy `apps/panel` on `ghcr.io/gecut/nginx/spa:1.0.0` as a pure static SPA without internal reverse proxying for CMS endpoints. Browser clients communicate directly with CMS API (`VITE_CMS_URL`), authenticated via cross-subdomain HttpOnly cookies (`COOKIE_DOMAIN`) with `sameSite: 'Lax'` and `secure: true`. CMS configures explicit `cors` and `csrf` allowlists for the panel origin. Both CMS (port 3000) and Panel (port 80) join `dokploy-network` for separate edge domain routing. Administrative accounts (`admin`, `employee`, `follow_up_specialist`) are strictly disallowed from authenticating into or navigating through operational panels; attempts immediately invalidate sessions and display dedicated guidance to use Payload Admin.

## D034 — Dokploy Compose decoupling, default variables, and streamlined CI image pipeline

1. Decouple PostgreSQL service and its volume from `docker-compose.production.yml`. In Dokploy, PostgreSQL is managed via Dokploy's managed database service or an external database instance.
2. Provide default fallback values for all Docker Compose variables (`MIGRATION_IMAGE`, `CMS_IMAGE`, `PANEL_IMAGE`, `IMAGE_TAG`, `DATABASE_URL`, `PAYLOAD_SECRET`, `PUBLIC_ORIGIN`, `PANEL_ORIGIN`, `SCHEMA_PUSH`, `RUN_JOBS`, `SMS_PROVIDER`) so that Dokploy compose services deploy cleanly without configuration errors.
3. Rewrite the GitHub Actions publish workflow (`publish-images.yml`) to optimize for speed and best practices:
   - Add concurrency control and workflow_dispatch triggers.
   - Cache pnpm store in `checks` step and eliminate unused PostgreSQL service container spin-up.
   - Use explicit matrix definitions with individual build-args and `fail-fast: false`.
   - Set `provenance: false` to produce clean single-platform AMD64 manifests for Dokploy without attestation bloat.
   - Publish `latest`, `main`, and semantic version tags in addition to full SHA tags.

## D035 — Panel Design System, Performance Solar Icons, and Operational UX Invariants

1. **Standardized Icon Library & Performance:** Panel UI standardizes on `@solar-icons/react` (`linear` family) via direct tree-shakable subpath imports (`@solar-icons/react/linear/<kebab-name>`). Root barrel imports are banned to preserve small bundle size and instant Vite HMR. All icons share standardized 1.5px stroke and round geometries.
2. **Typography & Contrast:** Mandate preloaded Vazirmatn webfont with `font-display: swap` across all panel routes and calibrate `--muted` text token to meet WCAG AA minimum 4.5:1 contrast.
3. **High-Throughput Reception UX:** Reception search is 100% keyboard-first with compact table/row cards (~48px). A single search match checks in immediately on `Enter`. Multiple matches navigate via `↑` / `↓` arrow keys and check in on `Enter`. Check-in immediately clears and returns focus to search. Walk-in 409 conflict provides candidate check-in and clear namesake disambiguation guidance.
4. **Invitation Live Timer & Note Preservation:** Invitation screen renders a live countdown badge (`MM:SS`) with 3-phase color transitions (normal, warning, danger pulse). Claim expiration safely freezes outcome actions while preserving entered notes and offering a one-click re-claim action. Hotkeys (1-4) strictly ignore form controls.
5. **Teacher Roster & Form Controls:** Teacher roster features live client-side name/phone filtering, compact single-line student rows, and optimistic update state rollback on network failures. Ceremony and Session dropdowns replace raw HTML `<select>` elements with accessible, theme-consistent `PanelSelect` components.

## D036 — Neighborhoods Entity and Relational Ceremony Attendance (Reverse Join)

1. **Neighborhoods Entity Collection (`neighborhoods`):** Model city geographic areas as an independent collection with unique, indexed names, optional descriptions, and an embedded `subDistricts` array (`{ name: string }`) containing sub-quarters, streets, and landmark avenues (e.g. هفت تیر, حافظ, صدف for وکیل‌آباد). This structure enables instantaneous, flexible client-side and server-side search across colloquial sub-areas without fragmenting canonical neighborhood assignment.
2. **Student Entity Extension:** Add `neighborhood` (relationship to `neighborhoods`), `landline` (text with digit/prefix normalization), `address` (textarea), `referrer` (text), and `notes` (textarea) to the `students` collection.
3. **Relational Ceremony Attendance via Reverse Join:** Adhere to the single-source-of-truth doctrine: actual attendance remains strictly modeled in `session-checkins` (`student` + `session`). Reverse navigation from `students` is provided via Payload 3 `type: 'join'` (`checkins` and `invitations`), eliminating mirrored foreign keys or redundant historical columns.
4. **Historical Event Seed & Archival Ingestion:** Legacy ceremonies from CSV imports (`نیمه1402`, `غدیر1403`, `نیمه1403`, `غدیر1404`, `غدیر1405`) are represented as completed ceremonies with archival sessions. Legacy attendances are mapped directly into valid `session-checkins` records with historical grade annotations, ensuring all past and future attendances share one unified queryable domain schema.
5. **Import/Export Plugin Expansion:** Enable synchronous CSV/JSON imports for `classes`, `teachers`, and `neighborhoods` alongside `students`, with pre-import normalization for Persian strings, phone digits, and dates.

## D037 — Ceremony Invitation Concurrency, Live Telemetry, and Reception Workflow Redesign

1. **Lock-Free Claiming & Concurrency Safety:**
   - Eliminate coarse ceremony-level table/advisory locks (`pg_advisory_xact_lock`) in favor of PostgreSQL row-level lock skipping: `SELECT s.id FROM students s ... FOR UPDATE OF s SKIP LOCKED LIMIT 1`. This allows dozens of inviter operators to claim student cards simultaneously with zero contention or database lock wait states.
   - Enforce single-filling invariant at the database engine level via a partial unique index: `CREATE UNIQUE INDEX sessions_single_filling_idx ON sessions (ceremony_id) WHERE status = 'filling'`.
   - Preserve in-flight claims during session advance with a graceful expiration period. Advancing a session does not delete active calls; operators can complete in-flight calls or select alternative sessions.
2. **Session Telemetry & Payload Admin Operational Dashboard:**
   - Add optional `capacity` (numeric) to Sessions and `attendancePolicy` (`single` vs `multiple`) to Ceremonies.
   - Replace the legacy raw advance button in Payload Admin with an interactive operational telemetry dashboard (`AdvanceSession.tsx`) displaying live fill ratios, progress bars, and controls for sequential advancement and explicit session reopen (`reopenCeremonySession`).
3. **Invitation Panel Ergonomics & Multi-Phone SMS:**
   - Enrich the inviter queue card with a comprehensive dossier: school grade, neighborhood name, referrer, and badges for the student's last 2 attended ceremonies.
   - Provide direct session selection with live capacity badges, allowing callers to assign students directly to alternative open sessions.
   - Consolidate call outcomes into 4 semantic buttons with hotkeys (1-4): `accepted`, `no_answer` (re-queues automatically for subsequent sessions; no SMS), `declined`, and `postponed` (with quick duration picker).
   - On `accepted`, personalized confirmation SMS is dispatched to all valid registered phones (student, father, mother).
4. **Reception Panel Redesign & Sibling Tolerance:**
   - Reception search results display all available phone numbers with relationship tags, school grade chip, neighborhood name, and an inline "ویرایش سریع" (Quick Edit) modal saving directly to `/panel/reception/student/update`.
   - Walk-in registration expands to capture full student fields (neighborhood, address, referrer, notes, and class-seeker toggle).
   - Duplicate phone detection on walk-in offers candidate check-in while providing an explicit button: «ثبت به عنوان دانش‌آموز جدید (عضو جدید خانواده)» (`allowSharedPhone: true`) to seamlessly support siblings and shared family phone numbers.
   - In `single` attendance ceremonies, duplicate attendance across sessions is blocked (409) and presents an explanatory modal detailing previous check-in time with an authorized staff exception override (`forceOverride: true`).

## D038 — Unrestricted Family Phone Sharing, Reception Live Breakdown, Teacher Dossier, and Clean Migration Baseline

1. **Unrestricted Family Phone Sharing in Walk-in:** Phone numbers in SRM walk-in registration are non-unique. Walk-in registration does not block or return a 409 conflict when a mobile or landline matches an existing family member. Duplicate check is restricted strictly to identical candidate full names (`firstName` + `lastName`).
2. **Reception Panel Live Telemetry Breakdown:** The reception dashboard incorporates a ceremony-wide telemetry card displaying total checked-in attendees across the entire ceremony alongside nominal capacity, plus an interactive grid of all ceremony sessions with live attendee counts, percentages, and 1-click active session switching.
3. **Teacher Panel Read-Only Student Dossier:** Teachers have access to the complete student dossier (grade, student/parent/landline phones with `tel:` links, neighborhood, address, referrer, notes) via a dedicated modal, maintaining the principle that teachers hold read-only dossier access while operational mutations remain confined to lifecycle transitions (`absorbed` / `removed`).
4. **Extensible Pattern-based SMS Architecture:** An extensible pattern SMS contract (`ISmsProvider.sendPatternSms(SendPatternParams)`) decouples background SMS dispatch from telecom vendors (Kavenegar/FarazSMS). The `SimulatedSmsProvider` captures and logs token interpolations in-memory for zero-friction testing and dev environments, ready for drop-in production vendor configuration without domain changes.
5. **Single Consolidated Migration Baseline:** All fragmented migrations are replaced with a single, comprehensive baseline migration (`20260929_130513_baseline.ts`) covering all collections, foreign keys, and PostgreSQL partial unique indexes (`sessions_single_filling_idx` and `students_has_callable_phone_idx`).

## D039 — Relational Student Ceremony Attendance, Fast Check-in Indexes, and Dossier De-cluttering

1. **Denormalization of Ceremony on Session Check-ins:**
   - Add explicit `ceremony` relationship (`ceremonies`) directly on `session-checkins`, automatically populated from `session.ceremony` via a `beforeValidate` hook.
   - Establish compound B-tree index on `(student, ceremony)` (`session_checkins_student_ceremony_idx`).
   - Replaces multi-step session-to-ceremony lookups during reception door check-ins with an ultra-fast, single $O(1)$ query for single-attendance policy validation.
2. **Synchronized Ceremony Attendance on Student Entity:**
   - Add `attendedCeremonies` (`relationship` to `ceremonies`, `hasMany: true`, read-only in Admin) on `students`.
   - Maintain consistency via transactional `afterChange` and `afterDelete` hooks on `session-checkins`, which recompute distinct ceremony IDs from `session-checkins` and update the student.
   - Enables native Payload Admin filtering by ceremony (e.g. `attendedCeremonies in [ceremonyId]`) with zero query overhead.
3. **De-cluttering Student Dossier:**
   - Remove `invitations` join from `Student` collection and Payload Admin edit view Tab 2. An outbound tele-calling log is not physical attendance and should not pollute the student profile.
   - Relabel `checkins` join to `'سوابق حضور در مراسم‌ها'` and position it in Tab 1 alongside `attendedCeremonies` with ceremony-first columns (`ceremony`, `session`, `source`, `checkedInAt`, `checkedInBy`).
4. **Teacher Panel Dossier Ceremony Badges:**
   - Expose `attendedCeremonies?: { id: number; title: string }[]` on `StudentCard` and `TeacherRoster`.
   - Batch-resolve ceremony titles in `getTeacherRoster` with zero N+1 queries.
   - Render ceremony attendance badges in the teacher student dossier modal.
5. **Consolidated Migration Baseline and Seed Overhaul:**
   - Consolidate all database migrations into a clean baseline (`20260930_133000_baseline.ts` & `.json`) including `students_rels` junction table and check-in compound indexes.
   - Overhaul historical production seed (`seed.ts`) and dev seed (`fixtures.ts`) to natively populate `ceremony` on check-ins and `attendedCeremonies` on students.

