# Data Import/Export Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and configure the official Payload CMS Import/Export plugin (`@payloadcms/plugin-import-export@3.89.0`) in `apps/cms` for Rasad SRM, enabling secure, synchronous CSV/JSON export of operational data and validated import of students with Persian normalization, Jalali date parsing, and origin tracking.

**Architecture:** Integrate `@payloadcms/plugin-import-export` via a dedicated modular configuration file (`apps/cms/src/integrations/importExport.ts`). Configure strict role-based access control (RBAC) on the injected `exports` and `imports` collections (Export allowed for `admin` and `employee`; Import strictly restricted to `admin`), enforce synchronous execution (`disableJobsQueue: true`) to avoid unmonitored queue stalls, stream exports directly (`disableSave: true`), and inject pre-import normalization hooks (`origin: 'import'`, phone normalization, Persian character cleanup, and Jalali date conversion via `apps/cms/src/lib/jalali.ts`) for students while locking down sensitive collections (`users`, `invitation-claims`).

**Tech Stack:** Payload CMS 3.89.0, Next.js 16.3.3, React 19.2.6, PostgreSQL (`@payloadcms/db-postgres`), TypeScript, Vitest.

**Spec / Baseline Sources:**

- Official Documentation: [https://payloadcms.com/docs/plugins/import-export](https://payloadcms.com/docs/plugins/import-export)
- Official Repository Reference: [payloadcms/payload/tree/3.x/packages/plugin-import-export](https://github.com/payloadcms/payload/tree/3.x/packages/plugin-import-export)
- Project Business Rules: [docs/BUSINESS_RULES.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/BUSINESS_RULES.md)
- Project Data Model: [docs/DATA_MODEL.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/DATA_MODEL.md)
- Project Roles & Permissions: [docs/ROLES_AND_PERMISSIONS.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/ROLES_AND_PERMISSIONS.md)
- Existing Jalali Utilities: [apps/cms/src/lib/jalali.ts](file:///Users/mm25zamanian/Codes/rasad-srm/apps/cms/src/lib/jalali.ts)

## Global Constraints

- Package version must strictly match Payload core: `@payloadcms/plugin-import-export@3.89.0`.
- The `users` collection must never allow export or import (`export: false, import: false`).
- The `invitation-claims` internal collection must never allow export or import (`export: false, import: false`).
- Operational collections (`classes`, `teachers`, `ceremonies`, `sessions`, `invitations`, `session-checkins`, `follow-ups`) are export-only (`import: false`) to safeguard ceremonial state invariants.
- Student import must run full domain validations (`beforeValidate`), set `origin: 'import'`, normalize Persian characters (`ي` → `ی`, `ك` → `ک`), normalize phone numbers via `normalizePhone`, and convert Jalali dates to Gregorian ISO instants via `jalaliInstant`.
- Matching on import uses student mobile (`matchField: 'mobile'`) in `upsert` and `update` modes, while also supporting `id` if provided in the file.
- Database schema changes require a formal PostgreSQL migration recorded in [apps/cms/src/migrations/index.ts](file:///Users/mm25zamanian/Codes/rasad-srm/apps/cms/src/migrations/index.ts).
- Export operations must support direct stream download (`disableSave: true`) without accumulating stale files on server disk.
- Admin UI must respect Persian locale (`fa`) and group import/export under the administrative section (`مدیریت داده`).

## Review Focus

- Role isolation: Non-admin users cannot trigger import; employees can export operational data but cannot import; teachers/inviters/receptionists cannot access export/import endpoints.
- Student deduplication on import: Matching by mobile number (`matchField: 'mobile'`) works properly in `upsert` and `update` modes.
- Synchronous processing: Exports and imports complete immediately without hanging in `pending` status when `RUN_JOBS` is false.
- Jalali date parsing: Persian date strings in import files (e.g. `1403/07/01` or `۱۴۰۳/۰۷/۰۱`) are safely converted to ISO instants before persistence.
- File system isolation: Temporary files during import are stored in a dedicated local directory (`apps/cms/media/imports`) that is ignored by git.
- Full type safety: `@rasad/contracts/src/payload-types.ts` accurately includes the generated `Export` and `Import` schema types.

---

### Task 1: Dependency Installation & Monorepo Package Integration

**Files:**

- Modify: `apps/cms/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**

- Consumes: `@payloadcms/plugin-import-export@3.89.0` from npm registry.
- Produces: Installed dependency matching `payload: 3.89.0` and `@payloadcms/ui: 3.89.0`.

- [x] **Step 1: Install `@payloadcms/plugin-import-export`**

Run:

```bash
pnpm --filter @rasad/cms add @payloadcms/plugin-import-export@3.89.0
```

- [x] **Step 2: Verify package.json and peer dependency compatibility**

Verify that `apps/cms/package.json` contains `"@payloadcms/plugin-import-export": "3.89.0"` under `dependencies` and that `pnpm install` succeeds without peer dependency warnings.

- [x] **Step 3: Commit**

```bash
git add apps/cms/package.json pnpm-lock.yaml
git commit -m "chore(cms): add @payloadcms/plugin-import-export dependency"
```

---

### Task 2: Modular Plugin Configuration Module

**Files:**

- Create: `apps/cms/src/integrations/importExport.ts`

**Interfaces:**

- Consumes:
  - `importExportPlugin` from `@payloadcms/plugin-import-export`
  - `normalizePhone` from `../domain/shared/core`
  - `isAdmin`, `isEmployeeOrAdmin` from `../access/roles`
  - `jalaliInstant` from `../lib/jalali`
- Produces:
  - `configuredImportExportPlugin`: configured Payload plugin ready to be added to `payload.config.ts`.

- [x] **Step 1: Create plugin integration module `apps/cms/src/integrations/importExport.ts`**

Configure the plugin with:

1. `overrideExportCollection`:
   - Labels: `singular: 'خروجی داده'`, `plural: 'خروجی‌های داده'`.
   - Access: `read: isEmployeeOrAdmin`, `create: isEmployeeOrAdmin`, `delete: isAdmin`.
   - Admin group: `'مدیریت داده'`.
   - `upload.staticDir`: `path.resolve(dirname, '../../media/exports')`.
2. `overrideImportCollection`:
   - Labels: `singular: 'ورودی داده'`, `plural: 'ورودی‌های داده'`.
   - Access: `read: isAdmin`, `create: isAdmin`, `delete: isAdmin`.
   - Admin group: `'مدیریت داده'`.
   - `upload.staticDir`: `path.resolve(dirname, '../../media/imports')`.
3. Collection configurations:
   - `students`:
     - `export`: `{ disableJobsQueue: true, disableSave: true }`
     - `import`: `{ disableJobsQueue: true, matchField: 'mobile', hooks: { before: [normalizeStudentImportBatch] } }`
   - Operational collections (`classes`, `teachers`, `ceremonies`, `sessions`, `invitations`, `session-checkins`, `follow-ups`):
     - `export`: `{ disableJobsQueue: true, disableSave: true }`
     - `import`: `false`
   - Sensitive collections (`users`, `invitation-claims`):
     - `export`: `false`
     - `import`: `false`
4. Implement `normalizeStudentImportBatch`:
   - Enforce `item.origin = 'import'`.
   - Normalize Persian letters for `firstName` and `lastName` (`ي` → `ی`, `ك` → `ک`, trim).
   - Normalize `mobile`, `motherMobile`, and `fatherMobile` via `normalizePhone`.
   - Convert date fields (`referredAt`, `absorbedAt`, `stabilizedAt`) if matching Jalali patterns (`/^(?:13|14|۱۳|۱۴)\d{2}[/-]\d{1,2}[/-]\d{1,2}$/`) into ISO strings via `jalaliInstant(dateStr, '12:00')`.

- [x] **Step 2: Commit**

```bash
git add apps/cms/src/integrations/importExport.ts
git commit -m "feat(cms): create import-export plugin configuration module"
```

---

### Task 3: Integration into `payload.config.ts` & Code Generation

**Files:**

- Modify: `apps/cms/src/payload.config.ts`
- Modify: `packages/contracts/src/payload-types.ts`
- Modify: `apps/cms/src/app/(payload)/admin/importMap.js` (generated)

**Interfaces:**

- Consumes: `configuredImportExportPlugin` from `./integrations/importExport`.
- Produces: Updated Payload config, regenerated ImportMap, regenerated TypeScript contracts.

- [x] **Step 1: Register plugin in `apps/cms/src/payload.config.ts`**

Add `configuredImportExportPlugin` to the `plugins: []` array in `payload.config.ts`.

- [x] **Step 2: Regenerate importmap**

Run:

```bash
pnpm --filter @rasad/cms generate:importmap
```

Expected: PASS with importMap updated to include `@payloadcms/plugin-import-export` components.

- [x] **Step 3: Regenerate TypeScript contract types**

Run:

```bash
pnpm --filter @rasad/cms generate:types
```

Expected: PASS with `packages/contracts/src/payload-types.ts` containing `Export` and `Import` interfaces.

- [x] **Step 4: Verify typecheck**

Run:

```bash
pnpm --filter @rasad/cms typecheck
```

Expected: PASS with 0 TypeScript errors.

- [x] **Step 5: Commit**

```bash
git add apps/cms/src/payload.config.ts packages/contracts/src/payload-types.ts apps/cms/src/app/\(payload\)/admin/importMap.js
git commit -m "feat(cms): register import-export plugin and regenerate contracts"
```

---

### Task 4: Database Migration for PostgreSQL

**Files:**

- Create: `apps/cms/src/migrations/YYYYMMDD_HHMMSS_add_import_export_tables.ts`
- Modify: `apps/cms/src/migrations/index.ts`

**Interfaces:**

- Consumes: Payload schema definition with `exports` and `imports` collections.
- Produces: Migration file creating PostgreSQL tables `payload_exports`, `payload_imports` (or `exports`, `imports`) and associated foreign keys and indexes.

- [x] **Step 1: Generate migration file**

Run:

```bash
pnpm --filter @rasad/cms payload migrate:create add_import_export_tables
```

- [x] **Step 2: Register migration in `apps/cms/src/migrations/index.ts`**

Import the generated migration and add it to the `migrations` array in `apps/cms/src/migrations/index.ts`.

- [x] **Step 3: Verify migration execution in test/dev environment**

Run:

```bash
pnpm --filter @rasad/cms migrate
```

Expected: Migration executes successfully and tables are created.

- [x] **Step 4: Commit**

```bash
git add apps/cms/src/migrations/
git commit -m "feat(cms): add database migration for import-export tables"
```

---

### Task 5: Integration Tests for Import & Export Workflows

**Files:**

- Create: `apps/cms/tests/int/import-export.int.spec.ts`

**Interfaces:**

- Consumes:
  - `payload` instance from test setup
  - Sample test data (students CSV)
- Produces: Automated test suite validating export generation, student import with hooks, and access control restrictions.

- [x] **Step 1: Write integration tests in `apps/cms/tests/int/import-export.int.spec.ts`**

Cover the following test cases:

1. **Export Students:** Direct export of existing students returns valid CSV/JSON headers and records for admin and employee.
2. **Import Students with Hooks:**
   - Import a CSV batch of students containing non-normalized Persian text (`علي كمالي`), raw mobile numbers (`09123456789`), and Jalali dates (`1403/07/01`).
   - Verify created documents have `origin: 'import'`, `firstName: 'علی'`, `lastName: 'کمالی'`, standardized phone format (`+989123456789`), and properly parsed ISO dates.
3. **Student Upsert matching:** Importing an existing mobile number with new attributes updates the student rather than creating a duplicate.
4. **Security & Access Control:**
   - Employees can export but CANNOT create imports.
   - Non-admin/non-employee users (teacher, inviter, receptionist) cannot read or create exports/imports.
   - The `users` and `invitation-claims` collections cannot be exported or imported.

- [x] **Step 2: Run integration tests**

Run:

```bash
pnpm --filter @rasad/cms test:int tests/int/import-export.int.spec.ts
```

Expected: All tests PASS.

- [x] **Step 3: Run full integration test suite**

Run:

```bash
pnpm --filter @rasad/cms test:int
```

Expected: All existing and new integration tests PASS.

- [x] **Step 4: Commit**

```bash
git add apps/cms/tests/int/import-export.int.spec.ts
git commit -m "test(cms): add integration tests for import-export plugin"
```

---

### Task 6: Dockerfile & Storage Persistence Verification

**Files:**

- Modify: `apps/cms/Dockerfile` (if storage directory creation or volume permissions are needed)

**Interfaces:**

- Consumes: Node runtime in Docker container.
- Produces: Ensured `/app/media` directory writable by `node` user in production.

- [x] **Step 1: Inspect and update Dockerfile runtime stage**

Ensure `apps/cms/Dockerfile` creates and chowns the `media` directory for temporary file processing:

```dockerfile
RUN mkdir -p /app/media/imports /app/media/exports && chown -R node:node /app/media
```

- [x] **Step 2: Verify production Docker build**

Run:

```bash
docker build -f apps/cms/Dockerfile -t rasad-cms-test .
```

Expected: Build succeeds with standalone Next.js server.

- [x] **Step 3: Commit**

```bash
git add apps/cms/Dockerfile
git commit -m "chore(cms): ensure media upload directory permissions in Dockerfile"
```
