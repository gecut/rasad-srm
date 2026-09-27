# Rasad SRM v2

Internal Persian/RTL Student Relationship Management. Payload Admin owns management; one Vite SPA owns invitation, teacher and reception tasks.

- `apps/cms`: Payload 3.89 / Next.js / PostgreSQL; `/admin`, `/api`, authorization, domain actions and jobs.
- `apps/panel`: React 19, Vite, TanStack file routes, HeroUI v3, Tailwind v4, centralized Payload REST SDK with HTTP-only cookies.
- `packages/contracts`: generated Payload types and public workflow DTOs, without server logic.

## Local development

Use Node **24.21.0** and pnpm **11.25.0**. Start PostgreSQL, create an empty `rasad_srm` database, then:

```sh
pnpm install --frozen-lockfile
cp apps/cms/.env.example apps/cms/.env
# Set DATABASE_URL and a strong PAYLOAD_SECRET in apps/cms/.env.
pnpm migrate
pnpm dev
```

CMS is [localhost:3000/admin](http://localhost:3000/admin); panel is [localhost:5173](http://localhost:5173). Vite proxies `/api` to CMS. `CMS_PROXY_TARGET` overrides the proxy target. `PUBLIC_ORIGIN` must match the browser origin exactly. Create the initial administrator in Payload Admin, then create Teacher profiles, Classes and role accounts. Operational accounts require a normalized mobile username; Teacher accounts require an active Teacher profile.

In Admin, create a scheduled/inviting Ceremony and chronological `queued` Sessions. Use **آغاز دعوت / پیشروی سانس** on the saved Ceremony to activate the first Session. Session dates use Persian date + time in Tehran; storage remains ISO instants.

## Development fixtures

For an explicitly local database named `rasad_srm_dev` (or another `rasad…_dev` / `rasad…_test` name), run `pnpm migrate` then `pnpm seed:dev` (the registered Payload `seed` CLI command). The seed creates 75 synthetic Students and all-role accounts, and preserves existing data on repeat runs. No reset or outbound SMS is performed. See [development seed scenarios and credentials](docs/DEV_SEED.md).

## Quality checks

```sh
pnpm typecheck
pnpm lint
pnpm build
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/rasad_srm_test pnpm test
```

Integration tests **erase fixtures** in the explicitly selected local database ending `_test`; never point tests at meaningful data. E2E uses a separately migrated disposable test database; see `docs/VERIFICATION.md` for the reproducible commands. `pnpm generate:types` regenerates contracts; do not hand-edit generated types or route trees.

## Deployment

`docker-compose.yml` supplies local CMS, panel and PostgreSQL. Export `PAYLOAD_SECRET` before starting it. For direct panel development, `apps/panel/.env.example` documents the optional `CMS_PROXY_TARGET` Vite proxy setting.

Production images are built from `apps/cms/Dockerfile` and `apps/panel/Dockerfile` with the repository root as build context. Pushes to `main` and `v*` tags publish both images to `ghcr.io/<owner>/<repo>/cms` and `ghcr.io/<owner>/<repo>/panel`. Both receive `sha-<full commit SHA>`; `main` or the Git tag is an additional alias. Use the **same immutable SHA tag** for both services. The workflow must pass typecheck, lint and tests before publishing.

For a private package, authenticate the deployment host with a GitHub token that has `read:packages` and access to both packages:

```sh
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
```

Copy the root `.env.example` to `.env`, replace the image paths and required runtime values, and set `IMAGE_TAG` to the published SHA tag. `docker-compose.production.yml` pulls those images; it does not build them. Keep PostgreSQL external and persistent. Before a v1 upgrade, stop old writers, verify a full backup, and rehearse migration on a restored copy as described in `docs/MIGRATION_NOTES.md`. Then bring up **one CMS replica** so its bundled production migrations complete before starting the panel or scaling CMS:

```sh
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --no-deps cms
docker compose -f docker-compose.production.yml ps cms
docker compose -f docker-compose.production.yml up -d panel
```

The panel serves the SPA on port 8080 and proxies `/admin`, `/api` and `/_next` to CMS. Terminate HTTPS at a trusted upstream reverse proxy that forwards the original `Host` and overwrites `X-Forwarded-Proto`; set `PUBLIC_ORIGIN` to that exact public HTTPS origin. Enable `RUN_JOBS=true` on only one CMS replica. Do not enable schema push on persisted data. No production deployment is performed by this repository task.

Read `docs/MIGRATION_NOTES.md` before upgrading existing v1 data. Automatic schema push is off; migrations are bundled for production startup. Always back up and rehearse on a copy. `SCHEMA_PUSH=true` is only for disposable development/test databases.

SMS results and delivery are separate. The included provider is a mock. Production without explicit mock/provider configuration fails delivery safely. `RUN_JOBS=true` enables the minute job runner on one CMS replica; a real SMS provider still requires the operator's provider selection and credentials.

`AGENTS.md` maps the normative product specifications in `docs/`.
