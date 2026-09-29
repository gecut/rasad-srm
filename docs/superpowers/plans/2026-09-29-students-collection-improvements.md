# Students Collection Ergonomics & Intelligent Lifecycle Hooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the `Students` collection validation and lifecycle management from rigid, manual validation errors into an intelligent, forgiving state machine; extract modular hooks into a dedicated domain module; guard class selection in Admin UI; enhance document display with full Persian names; and eliminate DRY access-control duplications.

**Architecture:**
- Extract all input sanitization (Unicode NFKC, Persian characters `ی`/`ک`, phone and landline normalization) and lifecycle transitions from the monolithic inline hook in `Students.ts` into a dedicated domain module `apps/cms/src/domain/students/studentHooks.ts`.
- Implement intelligent lifecycle state transitions:
  - When `currentClass` is assigned to a student in pre-class states (`unknown` or `class_seeker`), automatically transition to `referred_to_teacher`, stamp `referredAt`, and clear any previous `removedReason`.
  - When a student is already in `referred_to_teacher`, `absorbed`, or `stabilized`, subsequent document updates (or class transfers) must NEVER downgrade the lifecycle status, wipe timestamps, or trigger false-positive validation errors.
  - When `currentClass` is cleared/unassigned from a student in `referred_to_teacher`, gracefully transition back to `class_seeker` (instead of blocking the operator with an error).
  - When an authorized operator provides `absorbedAt`, automatically upgrade `referred_to_teacher` to `absorbed`.
  - When a student transitions away from `removed`, automatically clear `removedReason`.
- Introduce a virtual `fullName` field with an `afterRead` hook and set `useAsTitle: 'fullName'` for rich, unambiguous display across all Admin relations without altering PostgreSQL schema or requiring migrations.
- Add `filterOptions: { status: { not_in: ['cancelled', 'ended'] } }` to `currentClass` relationship to defensively prevent selecting closed classes.
- Replace repeated inline `access.update` checks across 10 fields with `isEmployeeOrAdmin` from `src/access/roles.ts`.

**Tech Stack:** Payload CMS 3.89.0, PostgreSQL (`@payloadcms/db-postgres`), TypeScript 5.7, Vitest.

**Spec / Baseline Sources:**
- Student Lifecycle Doctrine: [docs/STATUS_MODEL.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/STATUS_MODEL.md)
- Business Rules: [docs/BUSINESS_RULES.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/BUSINESS_RULES.md)
- Workflows (W1, W2, W3, W4, W5, W14): [docs/WORKFLOWS.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/WORKFLOWS.md)
- Existing Lifecycle Actions: [apps/cms/src/domain/students/lifecycleActions.ts](file:///Users/mm25zamanian/Codes/rasad-srm/apps/cms/src/domain/students/lifecycleActions.ts)
- Collection Definition: [apps/cms/src/collections/Students.ts](file:///Users/mm25zamanian/Codes/rasad-srm/apps/cms/src/collections/Students.ts)

---

## Global Constraints

- Canonical person entity remains `Student` (`دانش‌آموز`). Do not create parallel Contact entities.
- Zero breaking changes to existing database schema or baseline migrations; virtual fields must not generate schema drift.
- Persian character normalization (`ي` → `ی`, `ك` → `ک`, whitespace collapse, NFKC) is strictly enforced on all text fields.
- Server-side authorization and lifecycle invariants are authoritative.
- Downstream lifecycle states (`absorbed`, `stabilized`) must remain immutable against accidental downgrades during standard profile edits.
- All integration tests must pass with 100% green suites (`pnpm test:int`).

---

## Review Focus

1. **Downstream Lifecycle Immutability:** Editing fields (e.g. mobile, address, notes) on an `absorbed` or `stabilized` student must never downgrade status or throw validation errors.
2. **Graceful Class Unassignment:** Removing a class from a `referred_to_teacher` student must transition back to `class_seeker`, not throw an unexpected error.
3. **Reactivation Cleanup:** Moving a student from `removed` to an active state (`class_seeker` or `referred_to_teacher`) must clear `removedReason = null`.
4. **Virtual Field Performance:** The `fullName` virtual field must compute cheaply during `afterRead` without causing N+1 database queries.
5. **Class Selection Filter:** `filterOptions` on `currentClass` must exclude `cancelled` and `ended` classes while permitting `active`, `planned`, `admissions_paused`, `transition_to_preliminaries`, and `suspended`.

---

### Task 1: Domain Hook Extraction & Unit Tests (`studentHooks.ts`)

**Files:**
- Create: `apps/cms/src/domain/students/studentHooks.ts`
- Test: `apps/cms/tests/unit/studentHooks.spec.ts`

**Interfaces:**
- Produces:
  - `sanitizeStudentInput(data: Partial<Student>): void`
  - `applyStudentLifecycleTransitions(args: { data: Partial<Student>; originalDoc?: Student; req: PayloadRequest }): Promise<void> | void`
- Consumes:
  - `normalizePhone` from `../shared/core`
  - `stabilizationAllowed` from `../shared/lifecycle`
  - `APIError` from `payload`

- [ ] **Step 1: Write comprehensive unit test for student hooks**

```typescript
// apps/cms/tests/unit/studentHooks.spec.ts
import { describe, it, expect } from 'vitest'
import { sanitizeStudentInput, applyStudentLifecycleTransitions } from '@/domain/students/studentHooks'
import type { Student } from '@/payload-types'

describe('studentHooks', () => {
  describe('sanitizeStudentInput', () => {
    it('normalizes Persian/Arabic characters, trims and collapses spaces', () => {
      const data: Partial<Student> = {
        firstName: 'علي  ',
        lastName: '  رضايي ',
        address: 'خيابان   كوهسنگي',
        landline: '۰۵۱۳۸۴۵۰۰۰۰',
      }
      sanitizeStudentInput(data)
      expect(data.firstName).toBe('علی')
      expect(data.lastName).toBe('رضایی')
      expect(data.address).toBe('خیابان کوهسنگی')
      expect(data.landline).toBe('05138450000')
    })
  })

  describe('applyStudentLifecycleTransitions', () => {
    it('auto-transitions unknown/class_seeker to referred_to_teacher when currentClass is assigned', () => {
      const data: Partial<Student> = { currentClass: 10 }
      const originalDoc = { id: 1, lifecycleStatus: 'unknown' } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: {} as any })
      expect(data.lifecycleStatus).toBe('referred_to_teacher')
      expect(data.referredAt).toBeDefined()
      expect(data.removedReason).toBeNull()
    })

    it('does NOT downgrade absorbed or stabilized student when editing or changing class', () => {
      const data: Partial<Student> = { currentClass: 12, notes: 'کلاس تغییر یافت' }
      const originalDoc = {
        id: 1,
        lifecycleStatus: 'absorbed',
        currentClass: 10,
        absorbedAt: '2026-01-01T00:00:00.000Z',
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: {} as any })
      expect(data.lifecycleStatus).toBeUndefined() // preserved absorbed
      expect(data.absorbedAt).toBeUndefined() // preserved
    })

    it('transitions referred_to_teacher back to class_seeker when class is cleared', () => {
      const data: Partial<Student> = { currentClass: null }
      const originalDoc = {
        id: 1,
        lifecycleStatus: 'referred_to_teacher',
        currentClass: 10,
        referredAt: '2026-02-01T00:00:00.000Z',
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: {} as any })
      expect(data.lifecycleStatus).toBe('class_seeker')
      expect(data.referredAt).toBeNull()
    })

    it('auto-promotes to absorbed when absorbedAt is provided', () => {
      const data: Partial<Student> = { absorbedAt: '2026-03-01T00:00:00.000Z' }
      const originalDoc = {
        id: 1,
        lifecycleStatus: 'referred_to_teacher',
        currentClass: 10,
      } as Student
      applyStudentLifecycleTransitions({ data, originalDoc, req: {} as any })
      expect(data.lifecycleStatus).toBe('absorbed')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter cms test:unit tests/unit/studentHooks.spec.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `studentHooks.ts` in `apps/cms/src/domain/students/studentHooks.ts`**

Implement:
1. `sanitizeStudentInput` with text and phone cleaning.
2. `applyStudentLifecycleTransitions` with state-machine auto-transitions, date synchronizations, and invariant enforcement.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter cms test:unit tests/unit/studentHooks.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/cms/src/domain/students/studentHooks.ts apps/cms/tests/unit/studentHooks.spec.ts
git commit -m "feat(cms): add modular student hooks with intelligent lifecycle transitions"
```

---

### Task 2: Refactor `Students.ts` Collection

**Files:**
- Modify: `apps/cms/src/collections/Students.ts:1-523`

**Interfaces:**
- Consumes:
  - `sanitizeStudentInput`, `applyStudentLifecycleTransitions` from `../domain/students/studentHooks`
  - `isEmployeeOrAdmin` from `../access/roles`

- [ ] **Step 1: Wire new hooks into `Students.hooks.beforeValidate`**

Replace monolithic inline code in `hooks.beforeValidate` with calls to `sanitizeStudentInput` and `applyStudentLifecycleTransitions`.

- [ ] **Step 2: Add virtual `fullName` field and set `useAsTitle: 'fullName'`**

Add field:
```typescript
{
  name: 'fullName',
  label: 'نام و نام خانوادگی',
  type: 'text',
  virtual: true,
  admin: {
    hidden: true,
  },
  hooks: {
    afterRead: [
      ({ data }) => {
        return [data?.firstName, data?.lastName].filter(Boolean).join(' ')
      },
    ],
  },
}
```
Set `admin.useAsTitle: 'fullName'`.

- [ ] **Step 3: Add `filterOptions` to `currentClass`**

Add:
```typescript
filterOptions: {
  status: {
    not_in: ['cancelled', 'ended'],
  },
}
```

- [ ] **Step 4: Clean up repeated `access.update` inline functions**

Replace repeated `access: { update: ({ req }) => Boolean(...) }` with `access: { update: isEmployeeOrAdmin }`.

- [ ] **Step 5: Verify build & types**

Run: `pnpm --filter cms typecheck`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add apps/cms/src/collections/Students.ts
git commit -m "refactor(cms): streamline Students collection with modular hooks and defensive guardrails"
```

---

### Task 3: Integration Tests for Smart Transitions & Admin Workflows

**Files:**
- Modify: `apps/cms/tests/int/students.int.spec.ts`

- [ ] **Step 1: Add integration test scenarios for automated transitions**

Add tests covering:
- Assigning class to student automatically transitions to `referred_to_teacher` and sets `referredAt`.
- Subsequent profile update on `referred_to_teacher`, `absorbed`, or `stabilized` student does not revert status or throw error.
- Unassigning class from `referred_to_teacher` student automatically transitions back to `class_seeker`.
- Reactivating `removed` student clears `removedReason`.
- Virtual `fullName` renders correctly on fetched student.

- [ ] **Step 2: Run integration tests**

Run: `pnpm --filter cms test:int tests/int/students.int.spec.ts`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/cms/tests/int/students.int.spec.ts
git commit -m "test(cms): add integration tests for automated student lifecycle transitions"
```

---

### Task 4: Full Suite Verification & Monorepo Health Check

**Files:** None (Repository-wide verification)

- [ ] **Step 1: Run typecheck across entire monorepo**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 2: Run linter**

Run: `pnpm lint`
Expected: 0 errors

- [ ] **Step 3: Run all CMS integration test suites**

Run: `pnpm test:int`
Expected: 16/16 suites PASS (>115 tests passing)

- [ ] **Step 4: Commit and finalize**

```bash
git status
```
