# Panel-Wide HeroUI v3 Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize the entire `apps/panel` workspace (Reception, Invitation, and Shared UI) to strictly adopt HeroUI v3 compound components, eliminate raw HTML form/button primitives and ad-hoc style overrides, and deliver accessible, theme-compliant interfaces guided by `ui-ux-pro-max`, `nexload-design`, `nexload-code`, and `nexload-react`.

**Architecture:** Following the successful modernization of the Teacher panel and `PanelSelect`, upgrade Reception (`reception.tsx` and `_reception-row.tsx`) to use HeroUI v3 `<SearchField>` (with full keyboard-first check-in behavior preserved) and HeroUI `<Card>` components. Modernize Invitation (`invitation.tsx` and `_invitation-timer.tsx`) by replacing raw `role="button"` session cards and raw button overrides with interactive HeroUI `<Card>` and semantic buttons. Refine `ui.tsx` to ensure pure theme-token alignment.

**Tech Stack:** React 19, `@heroui/react` 3.2.6, `@heroui/styles` 3.2.6, Tailwind CSS v4, `@solar-icons/react` (linear family), `@rasad/contracts`.

**Spec:** `docs/RECEPTION_APP.md`, `docs/INVITATION_APP.md`, `docs/UX_RULES.md`

## Global Constraints

- **HeroUI v3 Only:** Must use compound components (`Card.Header`, `Card.Content`, `SearchField.Group`, `Select.Trigger`, `Modal.Dialog`, `TextField`, `TextArea`). No flat props or v2 patterns.
- **Theming Integrity:** Do not overwrite HeroUI theming with manual utility classes (`text-xs py-1.5 h-auto`, `bg-accent/20`, arbitrary ring or border hacks). Use HeroUI semantic variants (`primary`, `secondary`, `outline`, `soft`, `danger-soft`) and theme tokens (`--surface`, `--accent`, `--border`).
- **Reception Keyboard-First Invariant:** Upgraded HeroUI `SearchField` must preserve:
  - Global `/` shortcut to focus search.
  - ArrowDown / ArrowUp to navigate search results.
  - Enter to instantly check in single match or selected match.
  - Auto-clearing and focus retention after check-in.
- **Mobile Action Layout:** On mobile, card actions sit in a dedicated bottom action bar with standard `size="sm"` buttons and clean spacing, aligning horizontally on desktop.
- **Strict Typing & React Purity:** Follow `nexload-code` and `nexload-react` with zero TypeScript errors and zero ESLint warnings.

## Review Focus

1. **Reception Keyboard Navigation:** HeroUI `SearchField.Input` must handle `ref`, `onKeyDown`, and keyboard-driven selection with zero regression to speed or focus return.
2. **Interactive Session Cards:** Session selection cards in Reception and Invitation must be fully accessible (keyboard Enter/Space, focus indicators, aria-pressed/aria-selected).
3. **Button Sizing & Touch Targets:** Eliminate all `py-1.5 h-auto` hacks from `_reception-row.tsx` and `invitation.tsx`, utilizing native HeroUI `size="sm"` and `size="md"`.
4. **Live Claim Timer Resilience:** The invitation timer in `_invitation-timer.tsx` must render clean HeroUI `<Chip>` indicators with freeze styling when expired without visual clipping.
5. **No Regressions on Shared Contracts:** Ensure `pnpm --filter @rasad/panel test` passes completely without test suite breakage.

---

### Task 1: Modernize Reception Panel & Row (`_reception-row.tsx` & `reception.tsx`)

**Files:**
- Modify: `apps/panel/src/features/_reception-row.tsx`
- Modify: `apps/panel/src/features/reception.tsx`
- Test: `apps/panel/tests/api.test.ts` & `pnpm --filter @rasad/panel typecheck`

**Interfaces:**
- Consumes: `@heroui/react` (`Button`, `Card`, `Chip`, `SearchField`), `ReceptionStudent`
- Produces: Accessible, theme-compliant reception row cards and keyboard-first reception search.

- [x] **Step 1: Refactor `_reception-row.tsx` to HeroUI `<Card>`**

- Replace outer `div` with HeroUI `<Card>` with `variant="default"`.
- If selected (`isSelected`), apply `border-accent ring-1 ring-accent bg-accent/5`.
- Remove `text-xs py-1.5 h-auto` from quick edit and check-in buttons; use standard HeroUI `size="sm"` with `variant="outline"` and `variant="primary"`.
- Organize mobile layout with student info on top and actions in a clean bottom action bar with `border-t border-border/40 sm:border-0`.

- [x] **Step 2: Upgrade Reception Search to HeroUI v3 `<SearchField>`**

- In `apps/panel/src/features/reception.tsx`, replace the custom search div with:
```tsx
<SearchField
  value={query}
  onChange={(val) => {
    setQuery(val)
    if (searched) setSearched(false)
  }}
  className="w-full"
  aria-label="نام یا شماره موبایل دانش‌آموز"
>
  <Label className="text-sm font-medium">نام یا شماره موبایل دانش‌آموز</Label>
  <SearchField.Group>
    <SearchField.SearchIcon />
    <SearchField.Input
      id="reception-search-input"
      ref={searchRef}
      placeholder="نام دانش‌آموز یا شماره موبایل را وارد کنید... (کلید / برای جست‌وجو)"
      onKeyDown={(event) => {
        if (searched && students.length > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setSelectedIndex((prev) => (prev + 1) % students.length)
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setSelectedIndex((prev) => (prev - 1 + students.length) % students.length)
          } else if (event.key === 'Enter') {
            event.preventDefault()
            const targetStudent = students[selectedIndex] ?? students[0]
            if (targetStudent && !targetStudent.checkedIn) {
              void checkIn(targetStudent.id)
            }
          }
        }
      }}
    />
    <SearchField.ClearButton onPress={() => resetSearch()} />
  </SearchField.Group>
</SearchField>
```

- [x] **Step 3: Upgrade Physical Session Selector Pills to HeroUI `<Card>`**

- Replace raw `<button>` with `<Card>` using `role="button"` and keyboard handling, maintaining telemetry (capacity ratio, filling status, checked-in count).

- [x] **Step 4: Run typecheck and lint on reception updates**

Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint`
Expected: PASS with 0 errors.

- [x] **Step 5: Commit Reception modernization**

```bash
git add apps/panel/src/features/_reception-row.tsx apps/panel/src/features/reception.tsx
git commit -m "refactor(reception): modernize reception search and row with HeroUI v3 components"
```

---

### Task 2: Modernize Invitation Panel & Live Timer (`invitation.tsx` & `_invitation-timer.tsx`)

**Files:**
- Modify: `apps/panel/src/features/invitation.tsx`
- Modify: `apps/panel/src/features/_invitation-timer.tsx`
- Test: `pnpm --filter @rasad/panel typecheck` & `pnpm --filter @rasad/panel lint`

**Interfaces:**
- Consumes: `@heroui/react` (`Button`, `Card`, `Chip`, `Modal`, `TextField`, `TextArea`), `InvitationTimer`
- Produces: Idiomatic invitation interface with accessible session cards and theme-compliant live countdown.

- [x] **Step 1: Refactor `_invitation-timer.tsx` to HeroUI `<Chip>`**

- Replace manual styled span with HeroUI `<Chip size="sm" variant="soft">` with semantic color:
  - `color="accent"` when > 60s
  - `color="warning"` when 10s–60s
  - `color="danger"` when < 10s or expired
- Include `<StopwatchIcon className="size-3.5" />` and formatted countdown text.

- [x] **Step 2: Upgrade Session Cards in Invitation Calling View**

- Replace raw `<div role="button">` with HeroUI `<Card>`:
  - If selected: `border-accent bg-accent/10 ring-2 ring-accent`
  - If unselected: `border-border bg-surface hover:bg-muted/15`
  - Use `<Card.Content className="p-3.5 flex flex-col gap-2">`

- [x] **Step 3: Standardize Outcome Matrix Buttons**

- Clean up button classes: remove `h-auto py-3 px-4` and let HeroUI `size="lg"` govern spacing.
- Use HeroUI `<Kbd>` and semantic variants (`primary`, `outline`, `warning`, `danger-soft`).

- [x] **Step 4: Run typecheck and lint on invitation updates**

Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint`
Expected: PASS with 0 errors.

- [x] **Step 5: Commit Invitation modernization**

```bash
git add apps/panel/src/features/invitation.tsx apps/panel/src/features/_invitation-timer.tsx
git commit -m "refactor(invitation): upgrade invitation panel and timer to HeroUI v3 semantics"
```

---

### Task 3: Refine Shared UI Components (`ui.tsx`)

**Files:**
- Modify: `apps/panel/src/components/ui.tsx`
- Test: `pnpm --filter @rasad/panel typecheck` & `pnpm --filter @rasad/panel lint`

**Interfaces:**
- Produces: `Field`, `TextareaField`, `ErrorNotice`, `SuccessNotice`, `StatusChip`

- [x] **Step 1: Align `Label` and `Field` styling with pure HeroUI v3 theme defaults**

- Remove hardcoded typography classes on `<Label>` in `Field` and `TextareaField`, allowing HeroUI's theme to control text color and size natively.

- [x] **Step 2: Run typecheck and lint**

Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint`
Expected: PASS with 0 errors.

- [x] **Step 3: Commit `ui.tsx` refinements**

```bash
git add apps/panel/src/components/ui.tsx
git commit -m "refactor(ui): align shared form components with pure HeroUI v3 theme tokens"
```

---

### Task 4: Full Panel Verification & End-to-End Build

**Files:**
- Test: `apps/panel/tests/api.test.ts`
- Build: `apps/panel/dist/`

- [x] **Step 1: Run panel automated test suite**

Run: `pnpm --filter @rasad/panel test`
Expected: 11 passing tests.

- [x] **Step 2: Run full build and typecheck**

Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint && pnpm --filter @rasad/panel build`
Expected: Clean build in < 600ms with zero errors.

- [x] **Step 3: Final review and handoff**
