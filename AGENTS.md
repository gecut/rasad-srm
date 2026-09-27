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

## Core constraints

- Rasad is an internal Student Relationship Management system.
- Canonical person entity is `Student` (`دانش‌آموز`). Do not create a parallel Contact entity.
- Payload Admin remains the default management surface.
- Approved task panels are `/invite`, `/teacher`, and `/reception`.
- pnpm monorepo: `apps/cms` owns Payload/Next and server rules; `apps/panel` is one Vite SPA for all custom panels; `packages/contracts` shares generated API types.
- Custom panels use React 19+, TanStack Router file-based routes, HeroUI v3, Tailwind CSS v4, and the Payload REST SDK.
- Prefer same-origin production routing; Vite proxies `/api` in development.
- One auth-enabled `users` collection serves Admin and custom-panel identities.
- Custom-panel users authenticate with phone number + password; the phone is stored as normalized auth `username`.
- Never store plaintext passwords. Use Payload auth password handling.
- A Teacher remains a domain entity, but a teacher may be linked to a User account for `/teacher`.
- A Student has at most one current Class.
- Class assignment remains manual.
- Student lifecycle and ceremony invitation outcome are separate concerns.
- Ceremony invitation is ceremony-centric. A Session is assigned only to a successful accepted invitation.
- Sessions have no school-grade targeting and no capacity field.
- Sessions inside a Ceremony are filled sequentially. Exactly one Session may be in `filling` state at a time.
- Because Sessions have no capacity, moving from one filling Session to the next is an explicit authorized action.
- Reception attendance is a separate record and does not require a prior invitation.
- Server-side authorization and invariants are authoritative.

## Documentation maintenance

When a business rule changes, update every affected normative document in the same change. When a decision is accepted, append it to `docs/DECISIONS.md`. Do not preserve old behavior merely because existing code implements it.
