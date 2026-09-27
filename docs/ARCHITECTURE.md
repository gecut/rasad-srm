# ARCHITECTURE

## 1. Baseline

A pnpm monorepo with two applications and one contracts package:

```text
apps/cms           Payload 3 / Next.js: /admin, /api, PostgreSQL, domain services, jobs
apps/panel         One Vite / React 19 SPA: /login, /invite, /teacher, /reception
packages/contracts Generated Payload types and public workflow DTOs (no server logic)
```

## 2. Foundation

- pnpm workspaces, without Turborepo or Better-T-Stack.
- CMS retains the existing PostgreSQL adapter and working backend.
- Panel uses TanStack Router file-based routing and automatic route splitting.
- HeroUI v3, Tailwind CSS v4, Persian-first RTL.
- Centralized `@payloadcms/sdk` client with cross-origin credentials and direct API connection (`VITE_CMS_URL`).
- Panel is deployed as a static SPA on `ghcr.io/gecut/nginx/spa:1.0.0` without an internal API proxy.
- Direct browser-to-CMS API communication with CORS, CSRF, and shared cookie domain across subdomains (`COOKIE_DOMAIN`).
- Administrative accounts (`admin`, `employee`, `follow_up_specialist`) are restricted from operational panels and directed exclusively to Payload Admin.
- Vite development proxy or direct connection forwards `/api` to CMS.
- Generated Config types flow from contracts to both applications; contracts never depend on either app.
- Server authorization and business invariants remain in CMS.

## 3. Authentication

One auth-enabled `users` collection.

Custom-panel users authenticate by phone/password using Payload username login; Admin-side users may continue email login.

Passwords use Payload's built-in secure password storage. Do not implement plaintext credentials.

## 4. Domain collections

- users
- students
- teachers
- classes
- follow-ups
- ceremonies
- sessions
- invitations
- session-checkins

## 5. API strategy

Payload Admin uses native operations.

Custom panels use narrow server actions/endpoints for business workflows, including:

- `referStudentToClass`
- `markStudentAbsorbed`
- `confirmStabilization`
- `getNextCeremonyInvite`
- `submitInvitationOutcome`
- `advanceCeremonySession`
- `searchReceptionStudents`
- `checkInStudent`
- `quickCreateAndCheckInStudent`

Inside the same server runtime, prefer Payload Local API. When operating on behalf of a user, explicitly preserve access control or perform equivalent domain authorization; do not accidentally rely on Local API's default access override.

## 6. Invitation concurrency

Use short-lived claim/lease or equivalent atomic ownership for queue items.

Accepted submission must atomically/reliably revalidate:

- claim ownership;
- Invitation not already terminal/accepted;
- current Session is still the same `filling` Session.

No capacity transaction exists in v2.

## 7. Reception concurrency

Enforce unique Student + Session check-in. `quickCreateAndCheckInStudent` should avoid leaving a created Student without the intended Check-in when the selected DB supports a transaction.

## 8. Jalali scheduling

Data layer stores standard date-time instants. Jalali conversion is an Admin/custom-UI concern. Use a maintained compatible picker/conversion library chosen during implementation; do not alter the persisted date type to a formatted Persian string.

## 9. SMS

Invitation result commits first. SMS is queued as a secondary side effect and its technical status is separate.

## 10. Observability

At minimum diagnose:

- auth failures/lockouts;
- invitation claim collisions;
- Session-advance conflicts;
- invitation submit errors;
- SMS failures/retries;
- reception duplicate/check-in failures;
- authorization denials.
