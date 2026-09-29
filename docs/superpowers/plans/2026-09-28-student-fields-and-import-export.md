# Student Fields, Neighborhoods & Import/Export Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the Rasad SRM Payload CMS data model with a dedicated `neighborhoods` collection, new `students` fields (`neighborhood`, `landline`, `address`, `referrer`, `notes`), standard relational ceremony attendance via Payload 3 `type: 'join'`, reconfigure the Import/Export plugin for students, classes, teachers, and neighborhoods, and upgrade the production import pipeline.

**Architecture:**

- Apply domain-driven rules from `payload-collection-design`: maintain a single source of truth for each relationship.
- Model city neighborhoods as an independent `neighborhoods` collection (`slug: 'neighborhoods'`) with unique, indexed names, referenced by `students.neighborhood`.
- Include `subDistricts` (array of sub-areas/streets like هفت تیر, حافظ, صدف) inside each neighborhood for fast lookups, keyword searching, and intuitive UI grouping.
- Model ceremony attendance relationally without data duplication: `session-checkins` remains the single persistence owner for check-ins, while `students` exposes reverse navigation via Payload 3 `join` fields (`checkins` on `session-checkins.student` and `invitations` on `invitations.student`).
- Seed 5 completed historical ceremonies with archival sessions to represent legacy attendance from previous years in `session-checkins`.
- Expand `@payloadcms/plugin-import-export` integration in `apps/cms/src/integrations/importExport.ts`: enable import for `classes`, `teachers`, and `neighborhoods`, and update `normalizeStudentRow` to sanitize Persian text, normalize landlines, and resolve neighborhood references.
- Update normative specifications (`docs/DATA_MODEL.md` and `docs/DECISIONS.md`) in lockstep.

**Tech Stack:** Payload CMS 3.89.0, PostgreSQL (`@payloadcms/db-postgres`), TypeScript 5.7, Vitest.

**Spec / Baseline Sources:**

- Architecture & Doctrine: [docs/superpowers/specs/](file:///Users/mm25zamanian/Codes/rasad-srm/docs/superpowers/specs/)
- Collection Design Rules: [.agents/skills/payload-collection-design/SKILL.md](file:///Users/mm25zamanian/Codes/rasad-srm/.agents/skills/payload-collection-design/SKILL.md)
- Payload CMS Best Practices: [.agents/skills/payload/SKILL.md](file:///Users/mm25zamanian/Codes/rasad-srm/.agents/skills/payload/SKILL.md)
- Project Data Model: [docs/DATA_MODEL.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/DATA_MODEL.md)
- Project Decisions Log: [docs/DECISIONS.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/DECISIONS.md)
- Full Import Dataset: [apps/cms/data/import/students_unified_full.json](file:///Users/mm25zamanian/Codes/rasad-srm/apps/cms/data/import/students_unified_full.json)

---

## Global Constraints

- Canonical person entity remains `Student` (`دانش‌آموز`). Do not create parallel Contact entities.
- Every relationship must be persisted on exactly one side; reverse relationships must strictly use Payload `type: 'join'` rather than mirrored columns or synchronization hooks.
- Sensitive collections (`users`, `invitation-claims`) must stay completely disabled in Import/Export (`export: false, import: false`).
- Import operations must run with `disableJobsQueue: true` for predictable synchronous execution.
- Student import normalization must strictly sanitize Persian characters (`ي` → `ی`, `ك` → `ک`), trim whitespace, and normalize phone numbers.
- When domain models change, all affected normative documents in `docs/` must be updated in the same change.
- Never commit broken types or unmigrated schema changes: run `pnpm generate:types` and verify with `pnpm test:int` and `pnpm typecheck`.

## Review Focus

1. **Neighborhood Resolution on Import:** If a student record specifies a neighborhood by name that does not yet exist or has minor spelling variants, the pipeline must either resolve case/spelling variants cleanly or create/link safely without aborting the batch.
2. **Reverse Join Serialization:** Ensure the `type: 'join'` fields on `students` (`checkins`, `invitations`) do not break existing queries with `depth: 0` or create unbounded recursive population.
3. **Landline Normalization:** Persian landline digits and prefixes (e.g. `35090414` or `05138453694`) must be cleanly stored as sanitized strings without throwing false-positive errors on 8-digit local numbers.
4. **Historical Attendance Idempotency:** When importing historical ceremony attendance into `session-checkins`, compound uniqueness on `[student, session]` must prevent duplicate checkin records on re-runs.
5. **Class & Teacher Import Safety:** Importing classes and teachers via the plugin must respect role permissions (Admin only) and validate relationships (`primaryTeacher`).

---

### Task 1: Create `Neighborhoods` Collection & Register in Config

**Files:**

- Create: `apps/cms/src/collections/Neighborhoods.ts`
- Modify: `apps/cms/src/payload.config.ts:1-75`
- Test: `apps/cms/tests/int/collections/neighborhoods.test.ts`

**Interfaces:**

- Produces: `Neighborhoods: CollectionConfig` with slug `'neighborhoods'`
- Consumes: `isStaff`, `isEmployeeOrAdmin` from `../access/roles`

- [ ] **Step 1: Write integration test for `Neighborhoods` collection**

```typescript
// apps/cms/tests/int/collections/neighborhoods.test.ts
import { describe, it, expect } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'

describe('Neighborhoods Collection', () => {
  it('creates and retrieves a neighborhood with unique name and subDistricts list', async () => {
    const payload = await getPayload({ config })
    const created = await payload.create({
      collection: 'neighborhoods',
      data: {
        name: 'وکیل آباد',
        description: 'محدوده وکیل آباد مشهد',
        subDistricts: [{ name: 'هفت تیر' }, { name: 'حافظ' }, { name: 'صدف' }],
      },
      overrideAccess: true,
    })
    expect(created.id).toBeDefined()
    expect(created.name).toBe('وکیل آباد')
    expect(created.subDistricts).toHaveLength(3)
    expect(created.subDistricts?.[0]?.name).toBe('هفت تیر')

    await expect(
      payload.create({
        collection: 'neighborhoods',
        data: { name: 'وکیل آباد' },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @rasad/cms test:int neighborhoods`
Expected: FAIL (Cannot find collection 'neighborhoods')

- [ ] **Step 3: Implement `Neighborhoods` collection in `apps/cms/src/collections/Neighborhoods.ts`**

Define `Neighborhoods: CollectionConfig`:

- `slug: 'neighborhoods'`
- `labels: { singular: 'محدوده منزل', plural: 'محدوده‌های منزل' }`
- `admin: { group: 'افراد', useAsTitle: 'name', defaultColumns: ['name', 'createdAt'] }`
- `access: { read: isStaff, create: isEmployeeOrAdmin, update: isEmployeeOrAdmin, delete: isEmployeeOrAdmin }`
- `fields`:
  - `name`: text, required, unique, index
  - `description`: textarea
  - `subDistricts`: array of `{ name: text, required: true }`, labels: `{ singular: 'محله / معبر', plural: 'محله‌ها و معابر' }`, admin: `{ description: 'لیست محله‌ها و خیابان‌های این محدوده جهت جستجو و دسته‌بندی سریع (مانند: هفت تیر، حافظ، صدف)' }`

- [ ] **Step 4: Register `Neighborhoods` in `apps/cms/src/payload.config.ts`**

Import `Neighborhoods` and append to `collections: [...]`.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @rasad/cms test:int neighborhoods`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/cms/src/collections/Neighborhoods.ts apps/cms/src/payload.config.ts apps/cms/tests/int/collections/neighborhoods.test.ts
git commit -m "feat(cms): add neighborhoods collection"
```

---

### Task 2: Add New Fields and Reverse Joins to `Students` Collection

**Files:**

- Modify: `apps/cms/src/collections/Students.ts:40-266`
- Test: `apps/cms/tests/int/collections/students-fields.test.ts`

**Interfaces:**

- Produces: Updated `Students` collection with `neighborhood`, `landline`, `address`, `referrer`, `notes`, `checkins` (join), `invitations` (join).
- Consumes: `Neighborhoods` collection, `SessionCheckins` collection, `Invitations` collection.

- [ ] **Step 1: Write integration test for student new fields and joins**

```typescript
// apps/cms/tests/int/collections/students-fields.test.ts
import { describe, it, expect } from 'vitest'
import { getPayload } from 'payload'
import config from '@/payload.config'

describe('Students Extended Fields & Joins', () => {
  it('persists neighborhood relation, landline, address, referrer, and notes', async () => {
    const payload = await getPayload({ config })
    const neighborhood = await payload.create({
      collection: 'neighborhoods',
      data: { name: 'احمدآباد' },
      overrideAccess: true,
    })

    const student = await payload.create({
      collection: 'students',
      data: {
        firstName: 'علی',
        lastName: 'رضایی',
        neighborhood: neighborhood.id,
        landline: '05138450000',
        address: 'خیابان راهنمایی، پلاک ۱۰',
        referrer: 'مدرسه مفید',
        notes: 'علاقه‌مند به شرکت در جلسات عصر',
        lifecycleStatus: 'unknown',
        readinessStatus: 'normal',
        origin: 'admin',
      },
      overrideAccess: true,
    })

    expect(student.landline).toBe('05138450000')
    expect(student.address).toBe('خیابان راهنمایی، پلاک ۱۰')
    expect(student.referrer).toBe('مدرسه مفید')
    expect(student.notes).toContain('عصر')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @rasad/cms test:int students-fields`
Expected: FAIL

- [ ] **Step 3: Update `apps/cms/src/collections/Students.ts`**

1. In `beforeValidate`:
   - Add text cleaning (`NFKC`, Persian characters `ی`/`ک`, trimming) for `address`, `referrer`, `notes`.
   - Sanitize `landline` (strip whitespace, normalize Persian numerals).
2. In `fields`:
   - Add `neighborhood`: relationship to `'neighborhoods'`, `hasMany: false`, `index: true`.
   - Add `landline`: text, optional.
   - Add `address`: textarea, optional.
   - Add `referrer`: text, optional.
   - Add `notes`: textarea, optional.
   - Add `checkins`: type `'join'`, `collection: 'session-checkins'`, `on: 'student'`, `admin: { allowCreate: false }`.
   - Add `invitations`: type `'join'`, `collection: 'invitations'`, `on: 'student'`, `admin: { allowCreate: false }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @rasad/cms test:int students-fields`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/cms/src/collections/Students.ts apps/cms/tests/int/collections/students-fields.test.ts
git commit -m "feat(cms): add neighborhood, landline, address, referrer, notes and joins to students"
```

---

### Task 3: Seed Script for Historical Ceremonies, Sessions & Neighborhoods

**Files:**

- Create: `apps/cms/scripts/seed-historical-events-and-neighborhoods.ts`
- Modify: `apps/cms/package.json:20-27`

**Interfaces:**

- Produces: Database records for the 21 unique neighborhoods and 5 completed ceremonies (`نیمه1402`, `غدیر1403`, `نیمه1403`, `غدیر1404`, `غدیر1405`) each with an archival session.

- [ ] **Step 1: Write seeding script `seed-historical-events-and-neighborhoods.ts`**

The script must:

1. Extract and upsert the 21 unique neighborhoods from `students_unified_full.json` (e.g. `سجاد`, `احمدآباد`, `کوهسنگی`, `ابوطالب`, `فرامرز`, `آبکوه`, `وکیل آباد چپ`, `حومه`, `رضاشهر`, `امام رضا`, `قاسم آباد الهیه`, `وکیل آباد راست`).
2. Upsert the 5 historical ceremonies with `status: 'completed'`:
   - `جشن نیمه شعبان ۱۴۰۲` (slug/key: `نیمه1402`)
   - `جشن غدیر ۱۴۰۳` (slug/key: `غدیر1403`)
   - `جشن نیمه شعبان ۱۴۰۳` (slug/key: `نیمه1403`)
   - `جشن غدیر ۱۴۰۴` (slug/key: `غدیر1404`)
   - `جشن غدیر ۱۴۰۵` (slug/key: `غدیر1405`)
3. Ensure each historical ceremony has an archival completed session (`status: 'completed'`).
4. Output a summary table of verified records.

- [ ] **Step 2: Add npm script in `apps/cms/package.json`**

Add `"seed:historical": "cross-env NODE_OPTIONS=--no-deprecation tsx scripts/seed-historical-events-and-neighborhoods.ts"` to `scripts`.

- [ ] **Step 3: Run the seed script in dry-run/execution mode to verify**

Run: `pnpm --filter @rasad/cms seed:historical`
Expected: Successfully seeded 21 neighborhoods and 5 historical ceremonies with sessions.

- [ ] **Step 4: Commit**

```bash
git add apps/cms/scripts/seed-historical-events-and-neighborhoods.ts apps/cms/package.json
git commit -m "feat(cms): add seed script for neighborhoods and historical ceremonies"
```

---

### Task 4: Reconfigure Import/Export Plugin for Students, Classes, Teachers & Neighborhoods

**Files:**

- Modify: `apps/cms/src/integrations/importExport.ts:1-170`
- Test: `apps/cms/tests/int/integrations/import-export.test.ts`

**Interfaces:**

- Consumes: `@payloadcms/plugin-import-export`
- Produces: Updated `configuredImportExportPlugin` enabling import for `students`, `classes`, `teachers`, `neighborhoods`.

- [ ] **Step 1: Write integration tests for expanded import/export plugin**

```typescript
// apps/cms/tests/int/integrations/import-export.test.ts
import { describe, it, expect } from 'vitest'
import { normalizeStudentRow } from '@/integrations/importExport'

describe('Import/Export Normalization', () => {
  it('normalizes landline, address, referrer, and notes in student row', () => {
    const raw = {
      firstName: 'امیررضا',
      lastName: 'آتشکار  ',
      landline: ' 35090414 ',
      address: 'لادن23پ20  ',
      referrer: 'خانوم مشایخی',
      notes: 'خواهان کلاس',
    }
    const normalized = normalizeStudentRow(raw)
    expect(normalized.lastName).toBe('آتشکار')
    expect(normalized.landline).toBe('35090414')
    expect(normalized.address).toBe('لادن23پ20')
    expect(normalized.referrer).toBe('خانوم مشایخی')
    expect(normalized.origin).toBe('import')
  })
})
```

- [ ] **Step 2: Run test to verify initial state**

Run: `pnpm --filter @rasad/cms test:int import-export`

- [ ] **Step 3: Update `apps/cms/src/integrations/importExport.ts`**

1. Expand `normalizeStudentRow`:
   - Sanitize `landline` (trim, strip non-digit characters if needed).
   - Sanitize and trim `address`, `referrer`, `notes`.
2. In `configuredImportExportPlugin`:
   - Enable `import: { disableJobsQueue: true }` for `classes`.
   - Enable `import: { disableJobsQueue: true }` for `teachers`.
   - Add `neighborhoods` with:
     - `export: { disableJobsQueue: true, disableSave: true }`
     - `import: { disableJobsQueue: true }`
3. Maintain `users` and `invitation-claims` as `export: false, import: false`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @rasad/cms test:int import-export`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/cms/src/integrations/importExport.ts apps/cms/tests/int/integrations/import-export.test.ts
git commit -m "feat(cms): enable imports for classes, teachers, neighborhoods and extend student normalizer"
```

---

### Task 5: Upgrade Production Student Import Script

**Files:**

- Modify: `apps/cms/scripts/import-students-production.ts:1-157`

**Interfaces:**

- Consumes: `apps/cms/data/import/students_unified_full.json`
- Produces: Ingested students with neighborhoods, landlines, addresses, referrers, notes, and relational `session-checkins` records for past ceremonies.

- [ ] **Step 1: Update `import-students-production.ts` logic**

1. Point source JSON path to `apps/cms/data/import/students_unified_full.json`.
2. Preload all neighborhoods into an in-memory lookup map (`Map<name, id>`) to prevent repetitive database queries.
3. Preload the 5 historical ceremony sessions into a lookup map (`Map<ceremonySlug, sessionId>`).
4. In the student processing loop:
   - Map `neighborhood` string to its corresponding `id`.
   - Map `landline`, `address`, `referrer`, `notes` (join array if multiple).
   - If `ceremonies` dictionary exists on student:
     - After creating/finding student, create `session-checkins` records for each ceremony attended with `source: 'invited'`, `note: "پایه در مراسم: ${grade}"`, and `checkedInAt: ISOString`.
5. Support `--dry-run` flag with detailed statistics of students created, neighborhoods resolved, and checkins recorded.

- [ ] **Step 2: Run dry-run to verify import pipeline**

Run: `pnpm --filter @rasad/cms run import:students -- --dry-run`
Expected: Outputs full summary without errors, showing resolved neighborhoods and ceremony checkins.

- [ ] **Step 3: Commit**

```bash
git add apps/cms/scripts/import-students-production.ts
git commit -m "feat(cms): upgrade production student import script with full fields and ceremony checkins"
```

---

### Task 6: Update Normative Documentation (`docs/DATA_MODEL.md` & `docs/DECISIONS.md`)

**Files:**

- Modify: `docs/DATA_MODEL.md:20-60`
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Update `docs/DATA_MODEL.md`**

1. Add `neighborhoods` collection documentation (fields: `name`, `description`, `subDistricts` array of `{ name }`).
2. In `students` table, document:
   - `neighborhood`: relationship → neighborhoods
   - `landline`: text
   - `address`: textarea
   - `referrer`: text
   - `notes`: textarea
   - `checkins`: reverse join → session-checkins
   - `invitations`: reverse join → invitations

- [ ] **Step 2: Append Architectural Decision to `docs/DECISIONS.md`**

Document ADR:

- **Title:** Modeling Neighborhoods and Relational Ceremony Attendance (Reverse Join)
- **Status:** Accepted
- **Context:** Requirements from unified import dataset for neighborhood categorization and tracking ceremony attendances.
- **Decision:** Neighborhood is modeled as an independent entity collection. Ceremony attendance is modeled via single source of truth in `session-checkins` with reverse join on `students.checkins`. Historical CSV ceremonies are mapped into completed ceremonies and sessions.

- [ ] **Step 3: Commit**

```bash
git add docs/DATA_MODEL.md docs/DECISIONS.md
git commit -m "docs: update DATA_MODEL and DECISIONS with neighborhoods and reverse joins"
```

---

### Task 7: Database Migration, Type Generation & End-to-End Verification

**Files:**

- Create/Modify: `apps/cms/src/migrations/*`
- Modify: `packages/contracts/src/payload-types.ts`
- Modify: `apps/cms/src/payload-types.ts`

- [ ] **Step 1: Generate Payload TypeScript types**

Run: `pnpm --filter @rasad/cms generate:types`
Expected: Updates `@rasad/contracts/src/payload-types.ts` including `Neighborhood` interface and extended `Student` interface with `checkins` and `invitations`.

- [ ] **Step 2: Generate and apply database migration**

Run: `pnpm --filter @rasad/cms payload migrate:create add_neighborhoods_and_student_fields`
Review and execute: `pnpm --filter @rasad/cms migrate`
Expected: Successfully adds `neighborhoods` table and extends `students` columns in PostgreSQL.

- [ ] **Step 3: Run comprehensive verification**

Run:

1. `pnpm --filter @rasad/cms test:int`
2. `pnpm --filter @rasad/cms typecheck`
3. `pnpm typecheck`
   Expected: All tests pass and typecheck completes with 0 errors across the monorepo.

- [ ] **Step 4: Commit**

```bash
git add apps/cms/src/migrations/ packages/contracts/src/payload-types.ts apps/cms/src/payload-types.ts
git commit -m "feat(cms): database migration and updated payload types for neighborhoods and extended student fields"
```
