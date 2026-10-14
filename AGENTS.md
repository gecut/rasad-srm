# AGENTS.md — Rasad SRM v2

This file is a map. Normative project knowledge lives in `docs/`.

## Required reading

For product/domain changes, read these foundations; for narrowly scoped tasks, read only the relevant specifications:

1. `docs/PROJECT.md`
2. `docs/DOMAIN.md`
3. `docs/BUSINESS_RULES.md`
4. `docs/DECISIONS.md`

Then read the relevant specs:

- schema/data → `docs/DATA_MODEL.md`, `docs/STATUS_MODEL.md`
- workflows → `docs/WORKFLOWS.md`
- auth/permissions → `docs/AUTHENTICATION.md`, `docs/ROLES_AND_PERMISSIONS.md`
- Payload Admin → `docs/ADMIN_PANEL.md`
- invitation flow → `docs/CEREMONY_OPERATIONS.md`, `docs/INVITATION_APP.md`
- teacher panel → `docs/TEACHER_APP.md`
- reception/check-in panel → `docs/RECEPTION_APP.md`
- UX → `docs/UX_RULES.md`
- architecture/backend → `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_RULES.md`
- planning/migration → `docs/ROADMAP.md`, `docs/MIGRATION_NOTES.md`

## Operating Pipeline & Skill Map

Every task moves through these sequential phases. Trigger skills at branch points; observe completion criteria before transitioning.

### 1. Ingestion & Triage
- **Incoming issues & backlog requests** → invoke `triage`. Categorize role, assess clarity, resolve blockers, and prepare agent-ready briefs.
- **Large, multi-session initiatives** → invoke `wayfinder`. Decompose ambiguous scope into a directed graph of decision tickets.
- *Completion criterion*: Task has an explicit scope, identified owner, and resolved entry prerequisites.

### 2. Alignment, Grilling & Domain Modeling
- **Ambiguous requirements or unexplored ideas** → invoke `grill-me`. Run a relentless, decision-oriented interview to stress-test intent and close branching paths before designing.
- **Architecture/design proposals needing docs** → invoke `grill-with-docs`. Interview deeply and immediately record resulting ADRs in `docs/DECISIONS.md` and definitions in domain docs.
- **Entity, naming, or concept updates** → invoke `domain-modeling`. Maintain ubiquitous language, resolve nomenclature conflicts against `Student` and ceremony concepts, and update glossary.
- *Completion criterion*: Unambiguous decision record, documented domain terminology, and zero outstanding design dilemmas.

### 3. Architecture & Codebase Design
- **Module boundaries & interface definition** → invoke `codebase-design`. Structure deep modules with narrow interfaces and deep implementations across `apps/cms`, `apps/panel`, and `packages/contracts`.
- *Completion criterion*: Defined module boundaries, clear seams, minimal surface exposure, and isolated dependency directions.

### 4. Planning & Workspace Isolation
- **Multi-step implementation planning** → invoke `writing-plans`. Produce bite-sized, checklist-driven plans (`- [ ]`) containing concrete file paths, signatures, and checkable test steps.
- **Pre-execution workspace isolation** → invoke `using-git-worktrees`. Verify or create an isolated git worktree / branched workspace before touching files for feature work.
- *Completion criterion*: Approved implementation plan in `docs/superpowers/plans/` and a verified isolated workspace.

### 5. Execution & Orchestration
- **Single-session plan execution** → invoke `executing-plans`. Implement tasks step-by-step, logging decisions and maintaining strict adherence to the approved plan.
- **Multi-task plans with clean boundaries** → invoke `subagent-driven-development`. Delegate independent tasks to fresh subagents with narrow context boundaries and controller supervision.
- **Independent investigations or tasks** → invoke `dispatching-parallel-agents`. Dispatch concurrent agents for non-overlapping tasks without shared mutation state.
- *Completion criterion*: All plan checkboxes completed, each task committed cleanly, and branch ready for verification.

### 6. Investigation & Debugging
- **Unexpected failures, errors, or bugs** → invoke `systematic-debugging`. Follow the evidence-first loop: Reproduce → Gather evidence → Hypothesize → Test hypothesis → Fix root cause → Verify. Random edits and ungrounded trial-and-error fixes are forbidden.
- *Completion criterion*: Root cause identified with verifiable evidence and confirmed by an automated reproducing check.

### 7. Review, Verification & Quality Gate
- **Completion assertion** → invoke `verification-before-completion`. Execute concrete verification commands (typecheck, tests, build) and inspect actual stdout and exit codes. Never declare work "done" or "fixed" without fresh execution evidence.
- **Code quality & compliance audit** → invoke `code-review`. Run parallel, independent reviews along two axes: Standards (conventions, cleanliness, smells) and Spec (exact conformance to requirements).
- *Completion criterion*: Fresh passing command outputs attached, zero typecheck/lint regressions, and spec conformance confirmed.

### 8. Meta & System Evolution
- **Agent instructions & skill updates** → invoke `writing-for-agents`. Prune context load, front-load leading words, define checkable completion criteria, and preserve single source of truth.
- **Authoring new skills** → invoke `writing-skills`. Design skills test-first: baseline behavior without skill, draft `SKILL.md`, test under pressure, and eliminate loopholes.
- *Completion criterion*: Compact, discoverable markdown following `writing-for-agents` guidelines and tested against baseline scenarios.

## Core constraints

- Rasad is an internal Student Relationship Management system.
- Canonical person entity is `Student` (`دانش‌آموز`). Do not create a parallel Contact entity.
- Payload Admin remains the default management surface.
- Approved task panels are `/invite`, `/teacher`, and `/reception`.
- pnpm monorepo: `apps/cms` owns Payload/Next and server rules; `apps/panel` is one Vite SPA for all custom panels; `packages/contracts` shares generated API types.
- Custom panels use React 19+, TanStack Router file-based routes, HeroUI v3, Tailwind CSS v4, and the Payload REST SDK.
- Panel icons use `@solar-icons/react` (`linear` family) via tree-shakable subpath imports (`@solar-icons/react/linear/<kebab-name>`); root barrel imports are banned for bundle and HMR performance.
- Panel UI mandates Vazirmatn font with `font-display: swap`, WCAG AA contrast (minimum 4.5:1), and RTL-first geometry.
- Reception search is keyboard-first: Enter checks in single matches, arrow keys navigate multiple matches, and focus returns to search immediately.
- Invitation calling UI displays a live claim countdown with graceful expiration freeze, preserving operator notes on re-claim.
- Teacher roster enforces live client filtering and state rollback on network mutation errors.
- Prefer same-origin production routing; Vite proxies `/api` in development.
- One auth-enabled `users` collection serves Admin and custom-panel identities.
- Custom-panel users authenticate with phone number + password; the phone is stored as normalized auth `username`.
- Never store plaintext passwords. Use Payload auth password handling.
- A Teacher remains a domain entity, but a teacher may be linked to a User account for `/teacher`.
- A Student has at most one current Class.
- Class assignment remains manual.
- Student lifecycle and ceremony invitation outcome are separate concerns.
- Ceremony invitation is ceremony-centric. A Session is assigned only to a successful accepted invitation.
- Sessions have no school-grade targeting. Sessions have an optional nominal capacity field for operational telemetry.
- Sessions inside a Ceremony are filled sequentially. Exactly one Session may be in `filling` state at a time (enforced via PostgreSQL partial unique index).
- Moving from one filling Session to the next or reopening a session is an explicit authorized action guided by live telemetry.
- Reception attendance is a separate record and does not require a prior invitation. Ceremony attendance is tracked via indexed session check-ins, auto-synchronized to the student's attended ceremonies for instant filtering.
- Server-side authorization and invariants are authoritative.

## Documentation maintenance

When a business rule changes, update every affected normative document in the same change. When a decision is accepted, append it to `docs/DECISIONS.md`. Do not preserve old behavior merely because existing code implements it.
