# Verification

Node 24.21.0 / pnpm 11.25.0 are required. Never use a development or production database for tests.

## Integration and panel unit tests

Create a disposable local PostgreSQL database with name ending `_test`, then:

```sh
TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:55439/rasad_srm_v2_test pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

The integration setup explicitly opts into schema push and truncates fixtures for each serial suite. Parallel behavior is exercised within individual tests using simultaneous promises. Panel tests exercise actual SDK request/error handling, cookie credentials, session bootstrap and date formatting.

## Migration rehearsal

Create a fresh empty database ending `_test`, then from `apps/cms`:

```sh
PAYLOAD_SECRET=test-only-secret-at-least-32-characters DATABASE_URL=postgresql://postgres@127.0.0.1:55439/rasad_srm_rehearsal_test pnpm exec tsx scripts/migration-rehearsal.ts
```

This seeds v1 rows and asserts migration preservation. Use a fresh database for each run. Production rollback requires restoring the pre-migration backup.

## Browser workflows

Use a separate fresh database ending `_test`. From `apps/cms`, set `DATABASE_URL`, `PAYLOAD_SECRET`, and `PUBLIC_ORIGIN=http://localhost:5173` for all commands:

```sh
pnpm migrate
pnpm exec tsx scripts/seed-e2e.ts
pnpm dev
```

In another terminal run `pnpm dev:panel` from root. Then from root:

```sh
pnpm --filter @rasad/cms exec playwright test --config playwright.panels.config.ts
```

Fixtures are explicitly test-only: four known test accounts, one class/student and one ceremony. Tests exercise real phone login, claimed invitation submission, teacher absorption and reception search/check-in/walk-in at a 390px viewport. Recreate fixtures before repeating mutations. Existing CMS Admin tests use `playwright.config.ts` with a disposable TEST_DATABASE_URL.

The complete Admin + panel suite can alternatively manage both dev servers itself: stop existing ports 3000/5173, then run `TEST_DATABASE_URL=... pnpm test:e2e`. This seeds and replaces disposable fixtures. The separate panels config is for testing already-running isolated services, including the 390px mobile viewport.

## Verified MVP baseline (2026-09-24)

Under Node 24.21.0 / pnpm 11.25.0 with isolated PostgreSQL 14: frozen install, formatting, lint, typecheck, 89 CMS integration tests, 9 panel unit tests, 9 complete Chromium workflows, 4 separate mobile workflows, and both production builds passed. Migration checks covered empty initialization, populated-v1 preservation and conflict rollback. Both Compose configurations passed syntax validation. Docker image execution and real-provider SMS remain external checks; no production database or deployment was touched.

## Container release checks

Build both images from the repository root:

```sh
docker build --platform linux/amd64 -f apps/cms/Dockerfile -t rasad-cms:local .
docker build --platform linux/amd64 -f apps/panel/Dockerfile -t rasad-panel:local .
docker compose -f docker-compose.production.yml config
```

With a disposable migrated PostgreSQL database and production-style environment values, run Compose using local image names and a common `IMAGE_TAG=local`. Verify CMS `/admin/login`, Panel `/login` and `/invite` fallback, `/api/users/me` through Nginx, and forwarded HTTPS origin headers. Do not use the development or production database for destructive tests. After the first GitHub workflow run, verify that both GHCR packages have the same `sha-<full commit SHA>` tag and pull successfully with the deployment host's package credentials.
