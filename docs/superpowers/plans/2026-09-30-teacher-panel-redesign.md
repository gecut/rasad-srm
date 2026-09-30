# Teacher Panel Redesign & HeroUI v3 Idiomatic Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Teacher Panel in `apps/panel` to eliminate raw HTML built-ins and ad-hoc style overrides, strictly adopting HeroUI v3 compound components (`Select`, `SearchField`, `Card`, `Tabs`, `Chip`, `Button`, `Modal`, `TextField`), respecting HeroUI theming and design tokens, and delivering an accessible, uncluttered, responsive mobile layout guided by `ui-ux-pro-max`, `nexload-design`, `nexload-code`, and `nexload-react`.

**Architecture:** Replace the legacy raw `<select>` across the SPA and raw `<input type="search">` with HeroUI v3 `<Select>` and `<SearchField>`. Re-architect the teacher segmented tab bar using HeroUI's `<Tabs>` compound structure with symmetric `<Chip size="sm" variant="soft">` indicators and responsive label economy, eliminating arbitrary Tailwind color overrides. Upgrade the student row from a raw `div` to a HeroUI `<Card>` with standard button sizes and semantic variants, keeping only the primary mobile number on the card and delegating secondary phones (father, mother, landline) to the dossier modal.

**Tech Stack:** React 19, `@heroui/react` 3.2.6, `@heroui/styles` 3.2.6, Tailwind CSS v4, `@solar-icons/react` (linear family), `@rasad/contracts`.

**Spec:** `docs/TEACHER_APP.md`, `docs/UX_RULES.md`, `docs/STATUS_MODEL.md`

## Global Constraints

- **HeroUI v3 Only:** Must use compound components (`Select.Trigger`, `Select.Popover`, `ListBox.Item`, `SearchField.Group`, `Card.Content`, `Tabs.ListContainer`, `Modal.Dialog`). Do not use v2 patterns or flat props.
- **Theming Integrity:** Do not overwrite HeroUI theming with manual arbitrary utility classes (e.g. `bg-accent/20 text-accent font-bold`, `py-1.5 h-auto text-xs` on buttons). All colors, states, surfaces, and control sizes must derive from HeroUI semantic variants (`soft`, `outline`, `primary`, `danger-soft`, `secondary`) and theme tokens (`--accent`, `--default`, `--surface`, `--border`, `--segment`).
- **Universal `PanelSelect` Upgrade:** Upgrade the shared `PanelSelect` to HeroUI v3 compound `Select` without changing its external prop contract, benefiting Teacher, Invitation, and Reception panels.
- **Mobile First & Zero Horizontal Scroll:** Segmented control must span full width with 3 equal columns (`flex-1`) on mobile, with concise labels (`معرفی‌شده`, `جذب‌شده`, `حذف‌شده`) and single-line `whitespace-nowrap min-w-0`.
- **Card Action Bar on Mobile:** Action buttons on `TeacherStudentRow` must sit in a dedicated bottom action row on mobile with a subtle separator, standard `size="sm"` buttons, and clean spacing.
- **Card Phone De-Cluttering:** Display only the primary student mobile number on the card row; move father, mother, and landline phone details exclusively into the dossier modal.
- **Code & React Standards:** Follow `nexload-code` (strict typing, kebab-case private module names) and `nexload-react` (pure renders, explicit state owners, optimistic update rollback on mutation errors).

## Review Focus

1. **Mobile Segment Proportions:** On small screens (360px-390px), the 3 tabs (`معرفی‌شده`, `جذب‌شده`, `حذف‌شده`) must span the width equally (`flex-1`), with no text wrapping, no vertical pill distortion, and identical HeroUI `<Chip>` counters.
2. **SearchField Interaction:** HeroUI `SearchField` must handle live filtering, input clearing via clear button, and RTL search icon placement without style regressions.
3. **Select Popover Accessibility:** HeroUI `Select` in `PanelSelect` must smoothly display class options, correctly reflect selected class, and handle keyboard navigation (`ArrowDown`, `Enter`, `Escape`) properly.
4. **Button & Control Sizing:** All buttons must use standard HeroUI `size="sm"` and semantic variants without `py-1.5 h-auto` hacks.
5. **Phone Number Separation:** Only primary student mobile appears on the roster card row; secondary contact phones (father, mother, landline) appear when opening the student dossier modal.
6. **Mutation Error Rollback:** Optimistic student status updates (`referred_to_teacher` -> `absorbed` or `removed`) must revert to the previous roster snapshot if the network request fails.

---

### Task 1: Refactor `PanelSelect` to HeroUI v3 Compound `Select`

**Files:**
- Modify: `apps/panel/src/components/panel-select.tsx`
- Test: `apps/panel/tests/api.test.ts` (suite verification) + `pnpm --filter @rasad/panel typecheck`

**Interfaces:**
- Consumes: `@heroui/react` (`Label`, `ListBox`, `Select`)
- Produces: `PanelSelectProps`, `PanelSelect` component with compound HeroUI architecture, supporting `value`, `onChange`, `options`, `label`, `disabled`, `placeholder`.

- [ ] **Step 1: Check existing `PanelSelect` interface and callers**

Review `apps/panel/src/components/panel-select.tsx` props (`id`, `label`, `value`, `options: PanelSelectOption[]`, `placeholder`, `disabled`, `onChange`, `className`).

- [ ] **Step 2: Rewrite `PanelSelect` using HeroUI v3 `Select`**

Replace the raw `<select>` and manual `<ChevronDownIcon>` with:
```tsx
import { Label, ListBox, Select } from '@heroui/react'

export interface PanelSelectOption {
  value: string
  label: string
  isFilling?: boolean
  secondaryLabel?: string
}

export function PanelSelect({
  id,
  label,
  value,
  options,
  placeholder = 'انتخاب کنید...',
  disabled = false,
  onChange,
  className = '',
}: {
  id?: string
  label?: string
  value: string
  options: PanelSelectOption[]
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select
      id={id}
      selectedKey={value || null}
      onSelectionChange={(key) => {
        if (key !== null) onChange(String(key))
      }}
      isDisabled={disabled}
      placeholder={placeholder}
      className={`w-full ${className}`}
      variant="secondary"
    >
      {label && <Label>{label}</Label>}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox items={options} aria-label={label || 'گزینه‌ها'}>
          {(item) => (
            <ListBox.Item id={item.value} textValue={item.label}>
              <div className="flex items-center justify-between w-full gap-2">
                <span>{item.label}</span>
                {item.isFilling && (
                  <span className="text-xs text-accent font-medium">★ در حال تکمیل</span>
                )}
                {item.secondaryLabel && (
                  <span className="text-xs text-muted">{item.secondaryLabel}</span>
                )}
              </div>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}
```

- [ ] **Step 3: Run typecheck and verify `PanelSelect` compilation**

Run: `pnpm --filter @rasad/panel typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit `PanelSelect` refactor**

```bash
git add apps/panel/src/components/panel-select.tsx
git commit -m "refactor(panel): upgrade PanelSelect to HeroUI v3 compound Select"
```

---

### Task 2: Redesign `TeacherStudentRow` with HeroUI Semantic Components & De-Cluttered Phone Display

**Files:**
- Modify: `apps/panel/src/features/_teacher-student-row.tsx`
- Test: `pnpm --filter @rasad/panel typecheck` & `pnpm --filter @rasad/panel lint`

**Interfaces:**
- Consumes: `TeacherRoster` from `@rasad/contracts`, `@heroui/react` (`Button`, `Card`, `Chip`), Solar Icons
- Produces: `TeacherStudentRow` component rendering clean semantic HeroUI cards with un-overridden buttons, de-cluttered primary phone, and bottom action bar on mobile.

- [ ] **Step 1: Replace raw `div` with HeroUI `<Card>`**

Use `<Card>` and `<Card.Content>`:
- Remove manual border/bg classes and arbitrary `min-h-[56px]`.
- Structure card into top info area and bottom action bar on mobile (`w-full flex items-center justify-end gap-2 pt-2 border-t border-border/40 sm:border-0 sm:pt-0 sm:w-auto`).

- [ ] **Step 2: Clean up `<Button>` instances to use native HeroUI sizes and variants**

- Replace `<Button variant="outline" size="sm" className="text-xs py-1.5 h-auto flex items-center gap-1">` with standard HeroUI buttons:
  ```tsx
  <Button variant="outline" size="sm" isDisabled={busy} onPress={() => onViewDetails(student)}>
    <NotesIcon className="size-4 text-accent" />
    <span>پرونده</span>
  </Button>
  ```
- Replace absorption button with:
  ```tsx
  <Button variant="primary" size="sm" isDisabled={busy} onPress={() => onAbsorb(student)}>
    <CheckSquareIcon className="size-4" />
    <span>تأیید جذب</span>
  </Button>
  ```
- Replace removal button with:
  ```tsx
  <Button variant="danger-soft" size="sm" isDisabled={busy} onPress={() => onRemove(student)}>
    <TrashIcon className="size-4" />
    <span>حذف از روند</span>
  </Button>
  ```

- [ ] **Step 3: De-clutter Contact Phones on Card**

- Show ONLY the student's primary `mobile` on the card row (with `<bdi>` in LTR and `<PhoneIcon className="size-3 text-accent shrink-0" />`).
- If no mobile is present, show subtle placeholder or omit. Secondary phones remain accessible via the "پرونده" (Dossier) modal.

- [ ] **Step 4: Refactor Student Chips**

- Use `<Chip size="sm" variant="soft" color="default">` for grade and neighborhood.
- Use semantic color mapping for lifecycle status:
  - `absorbed`: `color="success"`
  - `referred_to_teacher`: `color="accent"`
  - `removed`: `color="danger"`
  - others: `color="default"`

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint`
Expected: PASS with 0 warnings and 0 errors.

- [ ] **Step 6: Commit `_teacher-student-row.tsx` redesign**

```bash
git add apps/panel/src/features/_teacher-student-row.tsx
git commit -m "refactor(teacher): redesign student row with HeroUI Card, bottom actions, and de-cluttered phones"
```

---

### Task 3: Redesign `Teacher` Feature with HeroUI `SearchField`, Idiomatic `Tabs`, and Semantic Tokens

**Files:**
- Modify: `apps/panel/src/features/teacher.tsx`
- Test: `pnpm --filter @rasad/panel typecheck` & `pnpm --filter @rasad/panel build`

**Interfaces:**
- Consumes: `@heroui/react` (`Alert`, `Button`, `Card`, `Chip`, `Modal`, `SearchField`, `Tabs`, `TextField`, `TextArea`), `PanelSelect`, `TeacherStudentRow`, `request` API client.
- Produces: `Teacher` page component with full HeroUI theming compliance and zero multi-line wrap on mobile.

- [ ] **Step 1: Replace raw search `<input>` with HeroUI v3 `<SearchField>`**

Import `SearchField` from `@heroui/react` and replace the manual div + absolute magnifier icon:
```tsx
<SearchField
  value={searchQuery}
  onChange={setSearchQuery}
  className="w-full sm:w-64"
  aria-label="جست‌وجوی دانش‌آموز"
>
  <SearchField.Group>
    <SearchField.SearchIcon />
    <SearchField.Input placeholder="جست‌وجوی نام یا موبایل..." />
    <SearchField.ClearButton />
  </SearchField.Group>
</SearchField>
```

- [ ] **Step 2: Refactor `<Tabs>` to use HeroUI `<Chip>` and Responsive Labels**

- Eliminate manual `bg-accent/20 text-accent font-bold` and raw `<span>` styling.
- Use HeroUI `<Chip size="sm" variant="soft">` with semantic colors:
  - Tab 1: `color={pendingCount > 0 ? 'accent' : 'default'}`
  - Tab 2: `color={absorbedCount > 0 ? 'success' : 'default'}`
  - Tab 3: `color="default"`
- Apply label economy for mobile symmetry without wrapping:
  - Tab 1: `<span className="inline sm:hidden">معرفی‌شده</span><span className="hidden sm:inline">به مدرس معرفی شده</span>`
  - Tab 2: `<span className="inline sm:hidden">جذب‌شده</span><span className="hidden sm:inline">جذب شده</span>`
  - Tab 3: `<span className="inline sm:hidden">حذف‌شده</span><span className="hidden sm:inline">حذف شده</span>`
- Configure `Tabs.Tab` layout:
  `className="flex-1 sm:flex-none px-2 sm:px-4"` with `whitespace-nowrap min-w-0` to guarantee single-line fit on any mobile screen.

- [ ] **Step 3: Refactor Modals to Clean HeroUI v3 Patterns and Complete Contact Phone Listing**

- In confirmation modal:
  - Use `Button variant="outline"` for Cancel.
  - Use `Button variant={pending?.status === 'absorbed' ? 'primary' : 'danger'}` for Submit.
  - Use `TextField` + `TextArea` + `Label` from `@heroui/react`.
- In dossier modal:
  - Present all phone numbers (student, father, mother, landline) in a clean 2-column grid with direct tel links and labels.
  - Use HeroUI `variant="primary"` and `variant="danger-soft"` for actions, eliminating `className="text-danger flex items-center gap-1"` hacks.

- [ ] **Step 4: Clean up Overview Card Header and Telemetry**

Ensure `<Card.Header>` telemetry chips use standard HeroUI `<Chip>` with `size="sm"` and `variant="soft"` cleanly aligning in responsive layouts.

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint`
Expected: PASS with 0 warnings and 0 errors.

- [ ] **Step 6: Commit `teacher.tsx` redesign**

```bash
git add apps/panel/src/features/teacher.tsx
git commit -m "refactor(teacher): redesign teacher panel with HeroUI SearchField and semantic Tabs"
```

---

### Task 4: End-to-End Build, Test & Visual Verification

**Files:**
- Test: `apps/panel/tests/api.test.ts`
- Build: `apps/panel/dist/`

- [ ] **Step 1: Run panel automated tests**

Run: `pnpm --filter @rasad/panel test`
Expected: 11 passing tests.

- [ ] **Step 2: Run full build and typecheck**

Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint && pnpm --filter @rasad/panel build`
Expected: Clean build in ~500ms with zero errors.

- [ ] **Step 3: Commit and summarize redesign**

Verify all files are committed and present the implementation report.
