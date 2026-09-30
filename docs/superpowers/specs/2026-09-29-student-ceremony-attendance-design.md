# Design Specification: Relational Student Ceremony Attendance & Reception Performance

- **Status:** Approved Draft
- **Date:** 2026-09-29
- **Domain:** Students, Ceremonies, Reception Check-in (`session-checkins`), Payload Admin, Teacher Panel

---

## 1. Problem Statement & Background

In the current schema and Payload Admin interface, the Student entity contains a major conceptual and operational flaw:
1. **Misleading "سوابق دعوت به مراسم‌ها" in Student Dossier:**
   The Student collection includes a reverse join to `invitations`. An invitation is an outbound tele-calling attempt (`accepted`, `declined`, `no_answer`, etc.) by an operator. It is **not** attendance:
   - A student invited 5 times may never have attended.
   - A student entering via walk-in (`reception_walk_in`) attends without an invitation record.
   - Presenting invitations as the student's ceremony history misleads staff into treating phone calls as physical attendance.
2. **Missing Direct Ceremony Relationship on `session-checkins`:**
   `session-checkins` (the single source of truth for physical arrival) only links to `session`. Because sessions use `useAsTitle: 'title'`, the reverse join table on Student only displays generic session titles (e.g. "سانس ۱" or "نوبت صبح") without revealing the Ceremony name.
3. **No Filtering or Visibility in Student List:**
   In Payload Admin, staff cannot filter students by "attended Ceremony X" nor see ceremony attendance badges in the main students table without opening each student individually.

---

## 2. Architecture & Design Principles

Adhering to canonical domain-driven design, `payload-collection-design`, and `performance-optimization`:

1. **Physical Reception as Sole Source of Truth:**
   Actual attendance remains strictly defined by records in `session-checkins`.
2. **Read-Optimized Denormalized Relationship (`attendedCeremonies`):**
   To avoid N+1 query overhead in list views while preserving Payload's native badge UI and relational filtering, `students` exposes a read-only `attendedCeremonies` relationship (`relationTo: 'ceremonies'`, `hasMany: true`).
   - Writes: Handled automatically via transactional `afterChange` and `afterDelete` hooks on `session-checkins`.
   - Reads: Instant $O(1)$ relational lookups via Payload's indexed `students_rels` table.
   - Admin UX: Visible as tags in `defaultColumns` and fully queryable in Payload Admin filters.
3. **Direct Ceremony Foreign Key on `session-checkins`:**
   Add `ceremony` relationship directly to `session-checkins`.
   - Auto-resolved in `beforeValidate` from `session.ceremony`.
   - Covered by a compound index `[student, ceremony]`.
   - Speeds up single-attendance policy checks in `reception-service.ts` from multi-hop queries down to a single index lookup.
4. **Relational Detail View via Reverse Join:**
   Update `students.checkins` join field:
   - Relabeled to `'سوابق حضور در مراسم‌ها'`.
   - Columns: `['ceremony', 'session', 'source', 'checkedInAt', 'checkedInBy']`.
   - Shows complete chronological arrival facts with ceremony name.
5. **Removal of `invitations` from Student Dossier:**
   Completely remove the `invitations` join field from `students` collection. Invitations remain queryable in the dedicated `/admin/collections/invitations` collection and the `/invite` panel.

---

## 3. Detailed Schema Specifications

### 3.1. `session-checkins` Collection

```ts
// apps/cms/src/collections/session-checkins/index.ts
export const SessionCheckins: CollectionConfig = {
  slug: 'session-checkins',
  labels: { singular: 'پذیرش', plural: 'پذیرش‌ها' },
  admin: {
    group: 'رویدادها',
    defaultColumns: ['student', 'ceremony', 'session', 'checkedInAt', 'source'],
  },
  access: { read: isStaff, create: () => false, update: () => false, delete: () => false },
  indexes: [
    { fields: ['student', 'session'], unique: true },
    { fields: ['student', 'ceremony'] },
  ],
  hooks: {
    beforeValidate: [populateCeremonyFromSession],
    afterChange: [syncStudentAttendedCeremoniesAfterChange],
    afterDelete: [syncStudentAttendedCeremoniesAfterDelete],
  },
  fields: [
    {
      name: 'student',
      label: 'دانش‌آموز',
      type: 'relationship',
      relationTo: 'students',
      required: true,
      index: true,
    },
    {
      name: 'ceremony',
      label: 'مراسم',
      type: 'relationship',
      relationTo: 'ceremonies',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'session',
      label: 'سانس',
      type: 'relationship',
      relationTo: 'sessions',
      required: true,
      index: true,
    },
    {
      name: 'checkedInBy',
      label: 'پذیرش‌کننده',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    { name: 'checkedInAt', label: 'زمان ورود', type: 'date', required: true },
    {
      name: 'source',
      label: 'نوع حضور',
      type: 'select',
      required: true,
      options: [
        { label: 'دعوت شده', value: 'invited' },
        { label: 'مراجعه حضوری', value: 'walk_in' },
      ],
    },
    { name: 'note', label: 'یادداشت', type: 'textarea' },
  ],
}
```

### 3.2. `students` Collection

```ts
// In apps/cms/src/collections/students/index.ts:
// 1. Add attendedCeremonies to defaultColumns:
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
]

// 2. Add attendedCeremonies relationship field in Tab 1 (مشخصات فردی و ارتباطی):
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
}

// 3. Update checkins join field in Tab 1:
{
  type: 'collapsible',
  label: 'سوابق حضور در مراسم‌ها',
  admin: {
    initCollapsed: false,
    description: 'لیست تمام مراسم‌ها و سانس‌هایی که دانش‌آموز در آن‌ها پذیرش قطعی شده است (منبع واحد حقیقت).',
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
}

// 4. Remove collapsible 'سوابق دعوت به مراسم‌ها' (invitations join) from Tab 2 completely.
```

---

## 4. Synchronization Logic & Performance Guarantees

### 4.1. Fast Ceremony Resolution Hook (`populateCeremonyFromSession`)
When a checkin is created or updated, if `data.ceremony` is missing, fetch the `session` and assign `data.ceremony = session.ceremony`.

### 4.2. Transactional Student Sync Hook (`syncStudentAttendedCeremonies`)
When a `session-checkin` is saved or removed:
```ts
export async function syncStudentAttendedCeremonies(
  payload: Payload,
  studentId: number,
  req: PayloadRequest,
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
    new Set(checkins.docs.map((c) => relationID(c.ceremony)).filter((id): id is number => Boolean(id))),
  )

  await payload.update({
    collection: 'students',
    id: studentId,
    data: { attendedCeremonies: ceremonyIds },
    overrideAccess: true,
    req,
  })
}
```

### 4.3. Reception Service Optimization (`reception-service.ts`)
The single-attendance check in `reception-service.ts` simplifies from:
```ts
// BEFORE: query sessions, collect IDs, query checkins with IN clause
const ceremonySessions = await payload.find({ collection: 'sessions', where: { ceremony: { equals: ceremony.id } } })
const sessionIds = ceremonySessions.docs.map(s => s.id)
const checkin = await payload.find({ collection: 'session-checkins', where: { and: [{ student: { equals: studentId } }, { session: { in: sessionIds } }] } })
```
To:
```ts
// AFTER: direct 1-step indexed query
const checkin = await payload.find({
  collection: 'session-checkins',
  where: {
    and: [
      { student: { equals: studentId } },
      { ceremony: { equals: ceremony.id } },
    ],
  },
  limit: 1,
  depth: 0,
  overrideAccess: true,
  req,
})
```
This cuts database latency by ~50% during high-throughput door check-ins.

---

## 5. Panel & Roster Alignment

### 5.1. Teacher Panel (`/teacher`)
- `teacher-service.ts`: Include `attendedCeremonies` (id, title) in student records mapped for class roster.
- `_teacher-student-row.tsx` & `teacher.tsx`: In the student dossier modal, display a "سوابق حضور در مراسم‌ها" badge group showing ceremony titles.

---

## 6. Consolidated Migration Baseline & Seed Overhaul Strategy

### 6.1. Single Consolidated Baseline Migration (Zero Incremental Churn)
Instead of layering temporary incremental migrations on top of the old baseline:
1. All migrations are reset and consolidated into a single clean baseline migration file:
   `apps/cms/src/migrations/<timestamp>_baseline.ts` (and corresponding `.json`).
2. `apps/cms/src/migrations/index.ts` exports this single authoritative baseline.
3. The baseline DDL includes:
   - `session_checkins` with `"ceremony_id" integer NOT NULL REFERENCES "ceremonies"("id") ON DELETE CASCADE`
   - B-tree index `"session_checkins_ceremony_idx"` on `"session_checkins" ("ceremony_id")`
   - Compound index `"session_checkins_student_ceremony_idx"` on `"session_checkins" ("student_id", "ceremony_id")`
   - Compound unique index `"student_session_idx"` on `"session_checkins" ("student_id", "session_id")`
   - `students_rels` relation mappings for `attendedCeremonies` pointing to `ceremonies`
   - Complete removal of legacy `invitations` join bindings on student views.
4. **Strict Safety Invariant:** The AI agent does **not** touch or reset the active database. The user will reset the database independently.

### 6.2. Comprehensive Seed Scripts Overhaul
All seed fixtures are updated to produce 100% compliant data natively:
1. `apps/cms/scripts/seed.ts` (Unified Production Seed):
   - Pre-resolves historical ceremony keys from `ceremonies.json` into database IDs.
   - When creating `students` from `students.json`, maps `st.ceremonies` directly into `attendedCeremonies` relation IDs.
   - When creating historical `session-checkins`, explicitly provides `ceremony: ceremonyId`.
2. `apps/cms/scripts/dev-seed/fixtures.ts` (Developer Fixtures):
   - Passes `ceremony: ceremonies[ceremonyIndex].id` when seeding checkin rows.
   - Adds strict verification assertions in `verifySeed` to ensure every check-in has the correct ceremony and each student's `attendedCeremonies` matches their check-ins.

