# ROADMAP — v2

## Phase 0 — Documentation and migration baseline

- replace v1 docs with v2;
- pin package versions;
- choose DB adapter;
- define migration for `contacts → students` and changed enums/fields.

Exit: code tasks have one coherent source of truth.

## Workspace foundation — before Phase 1

- mechanically move existing Payload/Next into `apps/cms`;
- share generated types through `packages/contracts`;
- establish and verify CMS install, startup, lint, typecheck, tests and build;
- create one `apps/panel` Vite SPA using TanStack Router, HeroUI v3, Tailwind v4 and Payload SDK;
- then proceed to domain changes.

## Phase 1 — Admin/domain refactor

- Student terminology/schema;
- lifecycle enum migration;
- Class status `transition_to_preliminaries`;
- remove Invitation `contactTarget`;
- remove Session grade/capacity fields;
- add Session fill states and `fillingStartedAt`;
- add `session-checkins`;
- update Admin labels/columns/filters.

## Phase 2 — Authentication refactor

- enable username login on `users`;
- add roles `teacher`, `receptionist`;
- phone normalization;
- `teacherProfile` relation;
- role-gated Admin access;
- shared custom-panel login flow.

## Phase 3 — Sequential ceremony invitation engine

- Ceremony-wide eligibility query;
- deterministic next-item selection;
- claim/lease protection;
- accepted assignment to current filling Session;
- alternative-Session requeue after advancement;
- `advanceCeremonySession` action;
- SMS fallback compatibility.

## Phase 4 — `/invite` v2 UI

- Ceremony/current Session context;
- current Student card;
- queue preview;
- four outcomes;
- remove grade/capacity/contact-target UI.

## Phase 5 — `/teacher`

- teacher auth/scope;
- Class list;
- referred/absorbed Student lists;
- permitted lifecycle transitions.

## Phase 6 — `/reception`

- Ceremony/Session context;
- name search;
- check-in;
- duplicate handling;
- quick walk-in create + check-in.

## Phase 7 — Jalali schedule UX

- choose maintained date-picker/conversion dependency;
- implement Jalali date + time in Admin;
- verify timezone/serialization behavior.

## Phase 8 — Hardening

- permission tests;
- concurrency tests;
- migration rehearsal;
- logs/metrics;
- mobile/keyboard polish.
