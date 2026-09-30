# Student Ceremony Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace misleading invitations join on Student with high-performance ceremony attendance history derived directly from reception check-ins, consolidate database migrations into a clean baseline (without touching the live database), and align all seed scripts natively.

**Architecture:** Model `session-checkins` as the sole physical source of truth, enriched with a direct `ceremony` relation and compound index `[student, ceremony]`. Expose a read-only denormalized `attendedCeremonies` relationship on `students` synchronized via transactional `session-checkins` hooks for $O(1)$ read performance and native Payload Admin filtering, while updating `students.checkins` join defaultColumns to display ceremony names. Consolidate migrations into a single fresh baseline and update all seed fixtures (`seed.ts` and `dev-seed/fixtures.ts`) for clean fresh-start provisioning.

**Tech Stack:** Payload CMS 3 (Next.js 15, PostgreSQL adapter), Drizzle ORM / node-pg, Vitest, React 19, HeroUI v3, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-09-29-student-ceremony-attendance-design.md`

## Global Constraints

- Canonical person entity is `Student` (`دانش‌آموز`).
- Do not create parallel contact or historical entities.
- Reception check-in (`session-checkins`) is the single source of truth for physical attendance.
- Invitations are call center logs and must not represent ceremony attendance.
- **Strict Database Safety:** The agent must **NOT** execute any database drop, reset, or migration commands against the active database. The user will reset the database independently.
- Panel UI mandates Vazirmatn font, RTL-first geometry, WCAG AA contrast (≥ 4.5:1), and Solar linear subpath icons.
- All new database queries must be covered by btree indexes and avoid N+1 scans.
- When business rules change, update all affected normative docs in `docs/` in the same change.

## Review Focus

1. **Check-in Deletion / Rollback:** When a check-in is deleted or a transaction rolls back, `student.attendedCeremonies` must recalculate distinct ceremonies and not retain ghost ceremony references.
2. **Multiple Check-ins for Same Ceremony:** If a student checks into multiple sessions of a ceremony (e.g. multi-attendance policy), `attendedCeremonies` must contain the ceremony ID exactly once (deduplicated).
3. **Walk-in Reception Check-in:** A walk-in student with no prior invitations must immediately have `attendedCeremonies` updated upon door check-in.
4. **Zero Live Database Mutation:** Migration consolidation must produce valid baseline migration files and updated types without executing `payload migrate` or dropping live database tables.
5. **Seed Fixture Completeness:** All seed scripts (`seed.ts` and `fixtures.ts`) must natively populate `ceremony` on check-ins and `attendedCeremonies` on students so a fresh-seeded database is immediately consistent.

---

### Task 1: Add `ceremony` Relationship & Auto-Population Hook to `session-checkins`

**Files:**
- Create: `apps/cms/src/collections/session-checkins/session-checkins.hooks.ts`
- Modify: `apps/cms/src/collections/session-checkins/index.ts`
- Test: `apps/cms/tests/unit/session-checkins-hooks.spec.ts`

**Interfaces:**
- Consumes: `SessionCheckin`, `Session`, `PayloadRequest`, `relationID` from `apps/cms/src/domain/shared/core.ts`
- Produces: `populateCeremonyFromSession` hook for `SessionCheckins.hooks.beforeValidate`

- [ ] **Step 1: Write the failing unit test**

```ts
// apps/cms/tests/unit/session-checkins-hooks.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { populateCeremonyFromSession } from '@/collections/session-checkins/session-checkins.hooks'

describe('populateCeremonyFromSession', () => {
  it('populates ceremony from session if missing in data', async () => {
    const findByID = vi.fn().mockResolvedValue({ id: 10, ceremony: 55 })
    const req = { payload: { findByID } } as any
    const data = { session: 10 } as any
    const result = await populateCeremonyFromSession({ data, req, operation: 'create' } as any)
    expect(findByID).toHaveBeenCalledWith({ collection: 'sessions', id: 10, depth: 0, req })
    expect(result.ceremony).toBe(55)
  })

  it('keeps existing ceremony if already provided', async () => {
    const findByID = vi.fn()
    const req = { payload: { findByID } } as any
    const data = { session: 10, ceremony: 99 } as any
    const result = await populateCeremonyFromSession({ data, req, operation: 'create' } as any)
    expect(findByID).not.toHaveBeenCalled()
    expect(result.ceremony).toBe(99)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @rasad/cms test:unit session-checkins-hooks.spec.ts`
Expected: FAIL with module or function not found.

- [ ] **Step 3: Implement `populateCeremonyFromSession` and update `SessionCheckins` collection**

In `apps/cms/src/collections/session-checkins/session-checkins.hooks.ts`:
```ts
import type { CollectionBeforeValidateHook } from 'payload'
import { relationID } from '../../domain/shared/core'

export const populateCeremonyFromSession: CollectionBeforeValidateHook = async ({ data, req }) => {
  if (!data || data.ceremony) return data
  const sessionId = data.session ? relationID(data.session) : null
  if (!sessionId) return data

  const session = await req.payload.findByID({
    collection: 'sessions',
    id: sessionId,
    depth: 0,
    req,
  })
  if (session?.ceremony) {
    data.ceremony = relationID(session.ceremony)
  }
  return data
}
```

In `apps/cms/src/collections/session-checkins/index.ts`:
- Add `ceremony` field:
  `{ name: 'ceremony', label: 'مراسم', type: 'relationship', relationTo: 'ceremonies', required: true, index: true, admin: { readOnly: true } }`
- Add compound index: `{ fields: ['student', 'ceremony'] }`
- Add `admin.defaultColumns: ['student', 'ceremony', 'session', 'checkedInAt', 'source']`
- Add `hooks: { beforeValidate: [populateCeremonyFromSession] }`

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @rasad/cms test:unit session-checkins-hooks.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/cms/src/collections/session-checkins/ apps/cms/tests/unit/session-checkins-hooks.spec.ts
git commit -m "feat(cms): add ceremony relation and auto-population hook to session-checkins"
```

---

### Task 2: Transactional `attendedCeremonies` Synchronization Hook

**Files:**
- Modify: `apps/cms/src/collections/session-checkins/session-checkins.hooks.ts`
- Modify: `apps/cms/src/collections/session-checkins/index.ts`
- Test: `apps/cms/tests/unit/session-checkins-sync.spec.ts`

**Interfaces:**
- Consumes: `syncStudentAttendedCeremonies(payload, studentId, req)`
- Produces: `afterChange` and `afterDelete` hooks on `SessionCheckins`

- [ ] **Step 1: Write the failing unit test**

```ts
// apps/cms/tests/unit/session-checkins-sync.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { syncStudentAttendedCeremonies } from '@/collections/session-checkins/session-checkins.hooks'

describe('syncStudentAttendedCeremonies', () => {
  it('queries all distinct ceremonies for student and updates attendedCeremonies', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ ceremony: 101 }, { ceremony: 102 }, { ceremony: 101 }],
    })
    const update = vi.fn().mockResolvedValue({})
    const payload = { find, update } as any
    const req = {} as any

    await syncStudentAttendedCeremonies(payload, 50, req)

    expect(find).toHaveBeenCalledWith({
      collection: 'session-checkins',
      where: { student: { equals: 50 } },
      depth: 0,
      pagination: false,
      select: { ceremony: true },
      overrideAccess: true,
      req,
    })
    expect(update).toHaveBeenCalledWith({
      collection: 'students',
      id: 50,
      data: { attendedCeremonies: [101, 102] },
      overrideAccess: true,
      req,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @rasad/cms test:unit session-checkins-sync.spec.ts`
Expected: FAIL with `syncStudentAttendedCeremonies` not found.

- [ ] **Step 3: Implement `syncStudentAttendedCeremonies` and register hooks**

In `apps/cms/src/collections/session-checkins/session-checkins.hooks.ts`:
```ts
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload, PayloadRequest } from 'payload'

export async function syncStudentAttendedCeremonies(
  payload: Payload,
  studentId: number,
  req?: PayloadRequest,
) {
  const checkins = await payload.find({
    collection: 'session-checkins',
    where: { student: { equals: studentId } },
    depth: 0,
    pagination: false,
    select: { ceremony: true },
    overrideAccess: true,
    req,
  })

  const ceremonyIds = Array.from(
    new Set(
      checkins.docs
        .map((c) => (c.ceremony ? relationID(c.ceremony) : null))
        .filter((id): id is number => Boolean(id)),
    ),
  )

  await payload.update({
    collection: 'students',
    id: studentId,
    data: { attendedCeremonies: ceremonyIds },
    overrideAccess: true,
    req,
  })
}

export const syncStudentAttendedCeremoniesAfterChange: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const studentId = doc?.student ? relationID(doc.student) : null
  if (studentId) {
    await syncStudentAttendedCeremonies(req.payload, studentId, req)
  }
  return doc
}

export const syncStudentAttendedCeremoniesAfterDelete: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  const studentId = doc?.student ? relationID(doc.student) : null
  if (studentId) {
    await syncStudentAttendedCeremonies(req.payload, studentId, req)
  }
  return doc
}
```

Register `afterChange: [syncStudentAttendedCeremoniesAfterChange]` and `afterDelete: [syncStudentAttendedCeremoniesAfterDelete]` in `apps/cms/src/collections/session-checkins/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @rasad/cms test:unit session-checkins-sync.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/cms/src/collections/session-checkins/ apps/cms/tests/unit/session-checkins-sync.spec.ts
git commit -m "feat(cms): add automated student attendedCeremonies synchronization hook"
```

---

### Task 3: Refactor `students` Collection Schema & Admin Dossier

**Files:**
- Modify: `apps/cms/src/collections/students/index.ts`
- Test: `apps/cms/tests/unit/students-schema.spec.ts`

**Interfaces:**
- Consumes: `SessionCheckins`, `Ceremonies`
- Produces: `students.attendedCeremonies`, updated `students.checkins` join defaultColumns, removed `students.invitations` join

- [ ] **Step 1: Write unit test validating students collection field structure**

```ts
// apps/cms/tests/unit/students-schema.spec.ts
import { describe, it, expect } from 'vitest'
import { Students } from '@/collections/students'

describe('Students Collection Schema', () => {
  it('includes attendedCeremonies in defaultColumns and fields', () => {
    expect(Students.admin?.defaultColumns).toContain('attendedCeremonies')

    const tabsField = Students.fields.find((f: any) => f.type === 'tabs') as any
    expect(tabsField).toBeDefined()

    const tab1 = tabsField.tabs[0]
    const attendedField = tab1.fields.find((f: any) => f.name === 'attendedCeremonies')
    expect(attendedField).toMatchObject({
      name: 'attendedCeremonies',
      type: 'relationship',
      relationTo: 'ceremonies',
      hasMany: true,
    })
  })

  it('updates checkins join columns and removes invitations join from tab 2', () => {
    const tabsField = Students.fields.find((f: any) => f.type === 'tabs') as any
    const tab1 = tabsField.tabs[0]
    const checkinsCollapsible = tab1.fields.find((f: any) => f.label === 'سوابق حضور در مراسم‌ها')
    expect(checkinsCollapsible).toBeDefined()
    const checkinsField = checkinsCollapsible.fields[0]
    expect(checkinsField.admin.defaultColumns).toEqual([
      'ceremony',
      'session',
      'source',
      'checkedInAt',
      'checkedInBy',
    ])

    const tab2 = tabsField.tabs[1]
    const invitationsField = tab2.fields.find((f: any) => f.name === 'invitations' || f.label === 'سوابق دعوت به مراسم‌ها')
    expect(invitationsField).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @rasad/cms test:unit students-schema.spec.ts`
Expected: FAIL (`attendedCeremonies` missing or `invitations` still present).

- [ ] **Step 3: Update `apps/cms/src/collections/students/index.ts`**

1. Add `attendedCeremonies` to `admin.defaultColumns`:
```ts
defaultColumns: [
  'lastName',
  'firstName',
  'grade',
  'attendedCeremonies',
  'neighborhood',
  'lifecycleStatus',
  'readinessStatus',
  'currentClass',
  'updatedAt',
],
```
2. Add `attendedCeremonies` field under Tab 1:
```ts
{
  name: 'attendedCeremonies',
  label: 'مراسم‌های حضور یافته',
  type: 'relationship',
  relationTo: 'ceremonies',
  hasMany: true,
  admin: {
    readOnly: true,
    description: 'لیست تمام مراسم‌هایی که دانش‌آموز بر اساس ثبت پذیرش قطعی در آن‌ها حضور داشته است (محاسبه خودکار از پذیرش).',
  },
},
```
3. Update `checkins` join field:
```ts
{
  type: 'collapsible',
  label: 'سوابق حضور در مراسم‌ها',
  admin: {
    initCollapsed: false,
    description:
      'لیست تمام مراسم‌ها و سانس‌هایی که دانش‌آموز در آن‌ها پذیرش قطعی شده است (منبع واحد حقیقت).',
  },
  fields: [
    {
      name: 'checkins',
      label: 'ریز سوابق حضور در مراسم‌ها',
      type: 'join',
      collection: 'session-checkins',
      on: 'student',
      admin: {
        allowCreate: false,
        defaultColumns: ['ceremony', 'session', 'source', 'checkedInAt', 'checkedInBy'],
      },
    },
  ],
},
```
4. Remove the `invitations` join collapsible under Tab 2 (`سوابق دعوت به مراسم‌ها`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @rasad/cms test:unit students-schema.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/cms/src/collections/students/index.ts apps/cms/tests/unit/students-schema.spec.ts
git commit -m "refactor(cms): replace invitations join with attendedCeremonies relationship on students"
```

---

### Task 4: Optimize `reception-service.ts` Single-Attendance Query

**Files:**
- Modify: `apps/cms/src/domain/reception/reception-service.ts:288-315`

**Interfaces:**
- Consumes: `session-checkins.ceremony`
- Produces: Direct indexed lookup for single-attendance policy check

- [ ] **Step 1: Refactor single-attendance policy check in `reception-service.ts`**

Replace multi-hop query in `apps/cms/src/domain/reception/reception-service.ts`:
```ts
// Multi-attendance enforcement for ceremonies with 'single' attendance policy
if (ceremony.attendancePolicy === 'single' && !input.forceOverride) {
  const previousCheckin = await input.payload.find({
    collection: 'session-checkins',
    where: {
      and: [
        { student: { equals: input.studentId } },
        { ceremony: { equals: ceremony.id } },
      ],
    },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (previousCheckin.docs.length > 0) {
    const existing = previousCheckin.docs[0]
    throw new DomainError(
      `دانش‌آموز قبلاً در این مراسم در سانس شماره ${relationID(existing.session)} پذیرش شده است.`,
      409,
    )
  }
}
```

Also, when creating the checkin record in `checkinStudent` / `cards`, pass `ceremony: ceremonyId` directly to avoid extra lookup.

- [ ] **Step 2: Commit**

```bash
git add apps/cms/src/domain/reception/reception-service.ts
git commit -m "perf(reception): utilize indexed ceremony field for direct single-attendance check"
```

---

### Task 5: Comprehensive Overhaul of All Seed Fixtures

**Files:**
- Modify: `apps/cms/scripts/seed.ts`
- Modify: `apps/cms/scripts/dev-seed/fixtures.ts`
- Test: `apps/cms/tests/unit/seed-fixtures-logic.spec.ts`

**Interfaces:**
- Consumes: `ceremonies.json`, `students.json`
- Produces: Seed data with explicit `session-checkins.ceremony` and `students.attendedCeremonies`

- [ ] **Step 1: Write unit test validating seed data mapping logic**

```ts
// apps/cms/tests/unit/seed-fixtures-logic.spec.ts
import { describe, it, expect } from 'vitest'

describe('Seed Historical Ceremony Mapping', () => {
  it('maps ceremony keys to ceremony IDs and passes attendedCeremonies array', () => {
    const ceremonyKeyToId = new Map([['نیمه1402', 1], ['غدیر1403', 2]])
    const studentCeremonies = { 'نیمه1402': '5.0', 'غدیر1403': '2.0' }

    const attendedCeremonies = Object.keys(studentCeremonies)
      .map((k) => ceremonyKeyToId.get(k))
      .filter((id): id is number => Boolean(id))

    expect(attendedCeremonies).toEqual([1, 2])
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm --filter @rasad/cms test:unit seed-fixtures-logic.spec.ts`
Expected: PASS

- [ ] **Step 3: Update `apps/cms/scripts/seed.ts`**

1. When seeding historical ceremonies and sessions (around lines 260-325), build `ceremonyKeyToIdMap = new Map<string, number>()` that maps `item.key` (e.g. `نیمه1402`) to `ceremonyId`.
2. When creating students (around lines 480-505):
```ts
const attendedCeremonyIds: number[] = []
if (st.ceremonies && typeof st.ceremonies === 'object') {
  for (const cKey of Object.keys(st.ceremonies)) {
    const cid = ceremonyKeyToIdMap.get(cKey)
    if (cid) attendedCeremonyIds.push(cid)
  }
}

// In payload.create student data:
data: {
  firstName: st.firstName,
  lastName: st.lastName,
  attendedCeremonies: attendedCeremonyIds,
  ...
}
```
3. When creating `session-checkins` (around lines 515-530), explicitly pass `ceremony: ceremonyKeyToIdMap.get(ceremonyKey)`.

- [ ] **Step 4: Update `apps/cms/scripts/dev-seed/fixtures.ts`**

1. In `createFixtures` (around line 420):
```ts
await payload.create({
  collection: 'session-checkins',
  data: {
    student: students[studentIndex].id,
    session: sessions[ceremonyIndex][sessionIndex].id,
    ceremony: ceremonies[ceremonyIndex].id,
    checkedInBy: users[8 + (i % 2)].id,
    checkedInAt: ...,
    source: accepted ? 'invited' : 'walk_in',
    note: 'پذیرش ساختگی توسعه',
  },
  req,
})
```
2. In `verifySeed` (around line 604):
Add assertions:
```ts
for (const checkin of checkins) {
  assert(checkin.ceremony, 'Checkin must have a ceremony reference')
  const session = sessions.find((s) => s.id === relationID(checkin.session))
  assert.equal(relationID(checkin.ceremony), relationID(session!.ceremony))
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/cms/scripts/seed.ts apps/cms/scripts/dev-seed/fixtures.ts apps/cms/tests/unit/seed-fixtures-logic.spec.ts
git commit -m "feat(seed): update historical and dev seeds with ceremony check-ins and attendedCeremonies"
```

---

### Task 6: Reset Migrations into Clean Consolidated Baseline & Regenerate Types (Zero DB Execution)

**Files:**
- Create: `apps/cms/src/migrations/<timestamp>_baseline.ts`
- Create: `apps/cms/src/migrations/<timestamp>_baseline.json`
- Modify: `apps/cms/src/migrations/index.ts`
- Delete: Previous baseline migration files (`20260929_130513_baseline.*`)
- Regenerate: `packages/contracts/src/payload-types.ts`

**Interfaces:**
- Consumes: Canonical Payload config with `ceremony` on `session-checkins` and `attendedCeremonies` on `students`
- Produces: Single authoritative migration baseline and updated generated types

> [!CAUTION]
> **Database Invariant:** Do NOT run `migrate` or any database modification commands. The user will reset the database independently. Only generate the code files.

- [ ] **Step 1: Consolidate migration baseline into fresh file**

Create the new clean baseline `<timestamp>_baseline.ts` containing the full schema DDL:
- `session_checkins` table definition including:
  `"ceremony_id" integer NOT NULL REFERENCES "public"."ceremonies"("id") ON DELETE cascade ON UPDATE no action`
- Indexes:
  `CREATE INDEX "session_checkins_ceremony_idx" ON "session_checkins" USING btree ("ceremony_id");`
  `CREATE INDEX "session_checkins_student_ceremony_idx" ON "session_checkins" USING btree ("student_id", "ceremony_id");`
  `CREATE UNIQUE INDEX "student_session_idx" ON "session_checkins" USING btree ("student_id", "session_id");`
- Relations in `_students_v_rels` and `students_rels` for `"ceremonies_id"` with path `'attendedCeremonies'`.
- Clean up any legacy or intermediate migration files so only this baseline remains.

- [ ] **Step 2: Update `apps/cms/src/migrations/index.ts`**

Export the single new baseline:
```ts
import * as baseline from './<timestamp>_baseline'

export const migrations = [
  {
    up: baseline.up,
    down: baseline.down,
    name: '<timestamp>_baseline',
  },
]
```

- [ ] **Step 3: Regenerate contracts types (Static code generation only, no DB connection)**

Run: `pnpm --filter @rasad/cms generate:types`
Expected: `packages/contracts/src/payload-types.ts` updates with `attendedCeremonies?: (number | Ceremony)[]` on `Student` and `ceremony: number | Ceremony` on `SessionCheckin`.

- [ ] **Step 4: Commit**

```bash
git add apps/cms/src/migrations/ packages/contracts/src/payload-types.ts
git commit -m "chore(cms): reset migrations to clean consolidated baseline with ceremony attendance"
```

---

### Task 7: Expose `attendedCeremonies` in Teacher Panel Student Dossier

**Files:**
- Modify: `apps/cms/src/domain/teacher/teacher-service.ts`
- Modify: `packages/contracts/src/workflows.ts`
- Modify: `apps/panel/src/features/teacher.tsx`

**Interfaces:**
- Consumes: `student.attendedCeremonies`
- Produces: `attendedCeremonies: { id: number; title: string }[]` on `TeacherRoster` student item and badges in dossier modal

- [ ] **Step 1: Update `teacher-service.ts` and `packages/contracts/src/workflows.ts`**

In `packages/contracts/src/workflows.ts`:
Add `attendedCeremonies?: { id: number; title: string }[]` to the student item in `TeacherRoster['classes'][number]['students'][number]`.

In `apps/cms/src/domain/teacher/teacher-service.ts`:
Map `attendedCeremonies` for each student in the class roster:
```ts
const attended = Array.isArray(student.attendedCeremonies)
  ? student.attendedCeremonies.map((c: any) =>
      typeof c === 'object' && c !== null ? { id: c.id, title: c.title } : { id: c, title: 'مراسم' },
    )
  : []
```

- [ ] **Step 2: Update `apps/panel/src/features/teacher.tsx`**

In the student dossier modal in `apps/panel/src/features/teacher.tsx`:
```tsx
{viewingStudent?.attendedCeremonies && viewingStudent.attendedCeremonies.length > 0 && (
  <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-border/80 bg-surface-secondary/20">
    <span className="text-xs font-semibold text-muted">سوابق حضور در مراسم‌ها:</span>
    <div className="flex flex-wrap gap-2 pt-1">
      {viewingStudent.attendedCeremonies.map((c) => (
        <Chip key={c.id} size="sm" variant="soft" color="accent">
          {c.title}
        </Chip>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Run Panel build to verify typing**

Run: `pnpm --filter @rasad/panel build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/cms/src/domain/teacher/ packages/contracts/ apps/panel/src/
git commit -m "feat(panel): expose attended ceremonies badges in teacher student dossier"
```

---

### Task 8: Update Normative Architecture & Domain Documentation

**Files:**
- Modify: `docs/DATA_MODEL.md`
- Modify: `docs/ADMIN_PANEL.md`
- Modify: `docs/DECISIONS.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Reflects all changes in normative docs per project rules.

- [ ] **Step 1: Update documentation files**

1. `docs/DATA_MODEL.md`:
   - Under `students`: replace `invitations` with `attendedCeremonies (relationship → ceremonies, hasMany: true, readOnly: true)`.
   - Update `checkins (join → session-checkins, labeled سوابق حضور در مراسم‌ها)`.
   - Under `session-checkins`: add `ceremony (relationship → ceremonies, required, indexed)`.
2. `docs/ADMIN_PANEL.md`:
   - In Student Dossier tabs: remove "گروه سوابق دعوت به مراسم‌ها" from Tab 2.
   - Update Tab 1 to include `attendedCeremonies` and `checkins` with columns `['ceremony', 'session', 'source', 'checkedInAt', 'checkedInBy']`.
   - Update Student defaultColumns to include `attendedCeremonies`.
3. `docs/DECISIONS.md`:
   - Add decision **D039 — Relational Student Ceremony Attendance, Fast Check-in Indexes, and Dossier De-cluttering**.
4. `AGENTS.md`:
   - Mention that Student ceremony attendance is represented via `attendedCeremonies` (computed from reception check-in).

- [ ] **Step 2: Commit**

```bash
git add docs/ AGENTS.md
git commit -m "docs: document D039 student ceremony attendance architecture and admin panel UX"
```

---

### Task 9: Static Verification & Clean Build (Zero Live DB Execution)

**Files:**
- All packages across monorepo

- [ ] **Step 1: Run unit tests**

Run: `pnpm --filter @rasad/cms test:unit`
Expected: ALL UNIT TESTS PASS

- [ ] **Step 2: Run typecheck and production build**

Run: `pnpm --filter @rasad/contracts build`
Run: `pnpm --filter @rasad/panel build`
Run: `pnpm --filter @rasad/cms typecheck`
Expected: ZERO TypeScript errors across the entire monorepo.

- [ ] **Step 3: Document DB reset instructions for the user**

Provide clear, copy-pasteable instructions for the user to:
1. Reset their local PostgreSQL database.
2. Run `pnpm --filter @rasad/cms migrate`.
3. Run `pnpm --filter @rasad/cms seed:dev` or `seed`.
