# IMPLEMENTATION RULES

## 1. Source-of-truth priority

1. explicit current user/task instruction;
2. `DECISIONS.md`;
3. BUSINESS_RULES / DOMAIN / STATUS_MODEL / WORKFLOWS;
4. DATA_MODEL;
5. architecture/UX specs;
6. existing code.

## 2. Version rules

Use current Payload CMS 3.x docs during implementation. Custom panels target HeroUI v3, React 19+, Tailwind CSS v4. Pin exact package versions; do not put unbounded `latest` in production manifests.

## 3. Domain-first

- use Student terminology;
- do not reintroduce Contact as a parallel entity;
- do not reintroduce Session grade/capacity;
- do not auto-assign Classes;
- do not conflate Invitation with Student lifecycle;
- do not conflate Check-in with Invitation.

## 4. Auth

- use Payload auth;
- phone login maps to normalized username;
- never persist plaintext password;
- deny `/admin` for custom-panel-only roles;
- custom endpoints must reauthorize server-side.

## 5. Business actions

Important state transitions are named server-side functions. Each action loads authoritative data, authorizes, validates invariants, mutates, triggers necessary side effects, and returns minimal output.

## 6. Mandatory validation

- grade, when present, ∈ 1..6;
- Session end > start when end is used;
- at most one `filling` Session per Ceremony;
- accepted Invitation gets current filling Session only;
- Session advancement is role-gated and state-safe;
- Teacher mutations are scoped to primary Classes;
- duplicate Student+Session Check-in forbidden;
- inviter/receptionist/teacher cannot mutate unrelated Student data.

## 7. Payload Local API caution

Local API can bypass access control by default. For user-scoped operations, pass user context with access override disabled or perform explicit domain authorization before privileged calls.

## 8. Hooks

Use hooks narrowly for normalization, invariant validation, and well-bounded post-commit reactions. Do not build a workflow engine in hooks.

## 9. Date/time

Persist actual date-time fields. Jalali is presentation/input. Normalize timezone explicitly, with product operations assumed in `Asia/Tehran` unless deployment configuration says otherwise.

## 10. Quality gates

For changed TypeScript: format, lint, typecheck, and build where practical. Add focused tests around domain invariants and auth boundaries as implementation proceeds.

## 11. Workspace boundaries

Use pnpm workspaces: `apps/cms`, `apps/panel`, `packages/contracts`. CMS owns every business action. Panel is one Vite SPA with TanStack Router file-based routes, HeroUI v3, Tailwind v4, and a centralized Payload REST SDK client. Generated contracts contain no business logic. Prefer same-origin deployment and a development `/api` proxy. Verify mechanical relocation before schema changes.
