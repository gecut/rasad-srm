# Panel Complete Remediation & UX Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely eliminate all visual, architectural, accessibility, performance, and UX defects across `apps/panel` (`/login`, `/invite`, `/reception`, `/teacher`), transforming it into a high-throughput, keyboard-first, polished operational workstation with standardized Solar icons.

**Architecture:** 
1. **Design System & Foundations:** Self-hosted/preloaded Vazirmatn webfont, WCAG AA contrast calibration, unified HeroUI tokens, and TanStack Router client navigation.
2. **Iconography & Performance:** Dedicated `@solar-icons/react` (`linear` family) tree-shakable subpath re-export module (`apps/panel/src/components/icons.tsx`), avoiding monolithic barrel imports to ensure micro-bundle size and instant Vite HMR.
3. **Definite Bug Fixes:** Eliminate keyboard event re-binding on note typing, focus stealing in modals, sticky header geometry collisions, and invalid CSS classes.
4. **UX & Operational Workflow Upgrades:** Live countdown badge with graceful expiration in `/invite`, high-density compact data rows with 100% keyboard flow (`Enter` and arrow keys) in `/reception`, namesake 409 disambiguation flow in Walk-in modal, live roster search and optimistic rollback in `/teacher`, and a theme-consistent `PanelSelect` component replacing raw HTML `<select>` elements.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, HeroUI v3, `@solar-icons/react`, TanStack Router.

**Spec References:**
- [`AGENTS.md`](file:///Users/mm25zamanian/Codes/rasad-srm/AGENTS.md)
- [`docs/UX_RULES.md`](file:///Users/mm25zamanian/Codes/rasad-srm/docs/UX_RULES.md)
- [`docs/DECISIONS.md#D035`](file:///Users/mm25zamanian/Codes/rasad-srm/docs/DECISIONS.md)
- [`docs/INVITATION_APP.md`](file:///Users/mm25zamanian/Codes/rasad-srm/docs/INVITATION_APP.md)
- [`docs/RECEPTION_APP.md`](file:///Users/mm25zamanian/Codes/rasad-srm/docs/RECEPTION_APP.md)
- [`docs/TEACHER_APP.md`](file:///Users/mm25zamanian/Codes/rasad-srm/docs/TEACHER_APP.md)

## Global Constraints

- Strictly preserve existing `@rasad/contracts` and server API routes.
- Persian/RTL layout and typography must remain first-class and robust on all OS environments.
- Zero layout shift (CLS) and smooth transitions honoring `prefers-reduced-motion`.
- All icons must originate from the centralized `components/icons.tsx` module importing directly from `@solar-icons/react/linear/<kebab-name>`.
- All tasks must pass:
  * `pnpm --filter @rasad/panel typecheck`
  * `pnpm --filter @rasad/panel lint`
  * `pnpm --filter @rasad/panel test`
  * `pnpm --filter @rasad/panel build`

## Review Focus

1. **Font rendering:** Vazirmatn must render reliably with `font-display: swap` even without local OS installation.
2. **Icon bundle performance:** No root barrel imports from `@solar-icons/react` (`dist/index.mjs` is ~57MB unpacked; subpath imports keep Vite bundle footprint to under a few kilobytes).
3. **Keyboard isolation:** Typing in inputs/textareas must never trigger outcome submissions (1-4) or steal search focus (`/`, `F2`).
4. **Single-result check-in:** In reception search, if a query yields exactly 1 result, pressing `Enter` must check them in and instantly return focus to the search field.
5. **Claim expiration:** When an invitation claim expires, outcome buttons must be safely disabled, the note must be preserved, and a one-click re-claim action must be offered.

---

### Task 1: Persian Webfont Preload & Typography Contrast

**Files:**
- Modify: `apps/panel/index.html:1-14`
- Modify: `apps/panel/src/styles/app.css:11-58`

**Interfaces:**
- Consumes: Google Fonts CDN for Vazirmatn.
- Produces: Normalized `--font-sans` with high-contrast `--muted` text token.

- [ ] **Step 1: Inspect font fallback and muted contrast**
Verify missing font preloading in `index.html` and low contrast `--muted` token.

- [ ] **Step 2: Add Vazirmatn stylesheet to `apps/panel/index.html`**
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
```

- [ ] **Step 3: Update font family and calibrate `--muted` in `app.css`**
Set `--font-sans: 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Tahoma, Arial, sans-serif;`
Set `--muted: oklch(42.00% 0.0062 187.41);` (WCAG AA compliant contrast on surface).

- [ ] **Step 4: Verify build and lint**
Run: `pnpm --filter @rasad/panel build && pnpm --filter @rasad/panel lint`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/panel/index.html apps/panel/src/styles/app.css
git commit -m "fix(panel): load Vazirmatn webfont and increase muted text contrast"
```

---

### Task 2: Standardized Solar Icons Performance Re-export Module

**Files:**
- Create: `apps/panel/src/components/icons.tsx`

**Interfaces:**
- Consumes: Direct subpaths from `@solar-icons/react/linear/*`.
- Produces: Strongly typed, tree-shakable icon primitives (`PhoneIcon`, `MagnifierIcon`, `CheckCircleIcon`, `CloseCircleIcon`, `CalendarIcon`, `StopwatchIcon`, `UserCheckIcon`, `UserPlusIcon`, `DangerCircleIcon`, `LogoutIcon`, `AltArrowDownIcon`, `LockIcon`, `ChatLineIcon`, `CheckSquareIcon`, `TrashBinTrashIcon`).

- [ ] **Step 1: Implement `apps/panel/src/components/icons.tsx`**
Re-export required linear icons with subpath imports:
```tsx
export { PhoneIcon } from '@solar-icons/react/linear/phone'
export { MagnifierIcon } from '@solar-icons/react/linear/magnifier'
export { CheckCircleIcon } from '@solar-icons/react/linear/check-circle'
export { CloseCircleIcon } from '@solar-icons/react/linear/close-circle'
export { CalendarIcon } from '@solar-icons/react/linear/calendar'
export { StopwatchIcon } from '@solar-icons/react/linear/stopwatch'
export { UserCheckIcon } from '@solar-icons/react/linear/user-check'
export { UserPlusIcon } from '@solar-icons/react/linear/user-plus'
export { DangerCircleIcon } from '@solar-icons/react/linear/danger-circle'
export { Logout2Icon as LogoutIcon } from '@solar-icons/react/linear/logout-2'
export { AltArrowDownIcon as ChevronDownIcon } from '@solar-icons/react/linear/alt-arrow-down'
export { LockIcon } from '@solar-icons/react/linear/lock'
export { ChatLineIcon } from '@solar-icons/react/linear/chat-line'
export { CheckSquareIcon } from '@solar-icons/react/linear/check-square'
export { TrashBinTrashIcon as TrashIcon } from '@solar-icons/react/linear/trash-bin-trash'
```

- [ ] **Step 2: Verify zero barrel overhead with node test**
Run: `node -e "import('./src/components/icons.tsx')"` (via vite or typescript compiler).
Run: `pnpm --filter @rasad/panel typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add apps/panel/src/components/icons.tsx
git commit -m "feat(panel): create centralized tree-shakable solar icons module"
```

---

### Task 3: Fix Reception `dir-ltr` Class Bug & Focus-Stealing Shortcuts

**Files:**
- Modify: `apps/panel/src/features/reception.tsx:48-62`
- Modify: `apps/panel/src/features/reception.tsx:395-405`

**Interfaces:**
- Consumes: Modal state `creating`, candidate phone number strings.
- Produces: Correct LTR phone layout and modal-isolated search shortcuts.

- [ ] **Step 1: Fix invalid `dir-ltr` class in duplicate candidates list**
In `reception.tsx:402`, replace invalid `className="dir-ltr"` with standard `dir="ltr"` and `<bdi>`.

- [ ] **Step 2: Guard search hotkeys (`/`, `F2`) when modal is open**
Check `if (creating) return;` and ensure inputs/textareas/selects/dialogs do not trigger search focus stealing.

- [ ] **Step 3: Verify typecheck and tests**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel test`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/panel/src/features/reception.tsx
git commit -m "fix(reception): fix candidate phone direction and guard search hotkey during modal"
```

---

### Task 4: Fix Invitation Keyboard Re-binding & Hotkey Element Exclusions

**Files:**
- Modify: `apps/panel/src/features/invitation.tsx:81-109`

**Interfaces:**
- Consumes: `queue.claim`, `busy`, `note`, `submitOutcome`.
- Produces: Stable event listener decoupled from `note` state, excluding all form controls (`SELECT`, `BUTTON`, `INPUT`, `TEXTAREA`).

- [ ] **Step 1: Decouple `note` and `submitOutcome` from keyboard listener effect**
Use a ref for latest submission state and remove `note` from the effect dependency array.

- [ ] **Step 2: Exclude all interactive controls in `handleKeyDown`**
Check `target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON'`.

- [ ] **Step 3: Verify listener stability**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel test`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/panel/src/features/invitation.tsx
git commit -m "fix(invitation): stabilize hotkey listener and exclude select/button controls"
```

---

### Task 5: Fix Reception Sticky Collision & Geometry

**Files:**
- Modify: `apps/panel/src/features/reception.tsx:162-180`
- Modify: `apps/panel/src/routes/_authenticated.tsx:41-45`

**Interfaces:**
- Consumes: App shell layout and Reception context card.
- Produces: Natural, non-colliding sticky flow without hardcoded `top-16` offset bugs.

- [ ] **Step 1: Refactor reception context card to document flow**
Remove `sticky top-16 z-20` from the context card so it does not collide with the main header on viewport resize or mobile wrapping.

- [ ] **Step 2: Verify responsive behavior**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel build`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add apps/panel/src/features/reception.tsx apps/panel/src/routes/_authenticated.tsx
git commit -m "fix(reception): eliminate hardcoded top-16 sticky collision"
```

---

### Task 6: SPA Navigation `<Link>`, Clean Up Dead Code & Upgrade Default States

**Files:**
- Modify: `apps/panel/src/routes/_authenticated.tsx:44-78`
- Modify: `apps/panel/src/routes/__root.tsx:1-21`
- Modify: `apps/panel/src/components/ui.tsx:105-125`
- Modify: `apps/panel/src/main.tsx:6-18`

**Interfaces:**
- Consumes: TanStack Router `<Link>`, HeroUI `Spinner`, `Button`, `LogoutIcon` from `components/icons`.
- Produces: True SPA routing without full page reloads; removal of dead `Section` component; polished router fallbacks.

- [ ] **Step 1: Replace raw `<a href="/">` with `<Link to="/">` and add `LogoutIcon`**
In `_authenticated.tsx`, use `<Link to="/">` and add `<LogoutIcon className="size-4" />` to the logout button.

- [ ] **Step 2: Remove unused `Section` component from `ui.tsx`**
Delete dead `Section` function and clean up exports.

- [ ] **Step 3: Upgrade default pending/error components in `main.tsx` and `__root.tsx`**
Use HeroUI `Spinner` and styled `Button` instead of unstyled HTML elements.

- [ ] **Step 4: Run full verification suite**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel lint && pnpm --filter @rasad/panel test`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add apps/panel/src/routes/_authenticated.tsx apps/panel/src/routes/__root.tsx apps/panel/src/components/ui.tsx apps/panel/src/main.tsx
git commit -m "refactor(panel): use TanStack Link, integrate logout icon, remove dead Section"
```

---

### Task 7: Invitation Live Countdown Badge, Solar Icons & Graceful Expiration UX

**Files:**
- Modify: `apps/panel/src/features/invitation.tsx:188-275`
- Create: `apps/panel/src/features/_invitation-timer.tsx`

**Interfaces:**
- Consumes: `queue.claim.expiresAt: string`, `claim: () => Promise<void>`, Solar Icons (`PhoneIcon`, `CheckCircleIcon`, `CalendarIcon`, `ChatLineIcon`, `CloseCircleIcon`, `StopwatchIcon`).
- Produces: Live countdown display with color transitions, outcome button icons, and safe expiration freeze.

- [ ] **Step 1: Implement `_invitation-timer.tsx`**
Create `_invitation-timer.tsx`:
- Compute remaining time in seconds to `expiresAt`.
- Format as Persian `MM:SS` with `<StopwatchIcon className="size-3.5" />`.
- Color mapping:
  * Remaining > 120s: `Chip color="default"`
  * Remaining <= 120s: `Chip color="warning"`
  * Remaining <= 45s: `Chip color="danger" className="animate-pulse"`
- Emit `onExpire()` when countdown hits 0.

- [ ] **Step 2: Integrate timer and Solar icons into `invitation.tsx`**
- In outcome buttons, render:
  * accepted: `<CheckCircleIcon className="size-5" />`
  * needs_alternative_session: `<CalendarIcon className="size-5" />`
  * no_answer_sms: `<ChatLineIcon className="size-5" />`
  * failed: `<CloseCircleIcon className="size-5" />`
- In click-to-call buttons, render `<PhoneIcon className="size-4 text-accent" />`.
- When expired:
  * Disable outcome buttons.
  * Render prominent «تمدید مهلت تماس» button (calls `claim()` without clearing `note`).

- [ ] **Step 3: Verify timer behavior and state retention**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel test`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/panel/src/features/invitation.tsx apps/panel/src/features/_invitation-timer.tsx
git commit -m "feat(invitation): add live countdown timer with solar icons and graceful expiration"
```

---

### Task 8: Reception Compact Data Rows, Solar Icons & 100% Keyboard-First Check-in Flow

**Files:**
- Modify: `apps/panel/src/features/reception.tsx:238-368`
- Create: `apps/panel/src/features/_reception-row.tsx`

**Interfaces:**
- Consumes: `ReceptionStudent[]`, `sessionId`, `checkIn(id: number)`, Solar Icons (`MagnifierIcon`, `UserPlusIcon`, `UserCheckIcon`, `DangerCircleIcon`).
- Produces: High-density list row (~48px) with arrow-key navigation and single-result `Enter` check-in.

- [ ] **Step 1: Create `ReceptionRow` component**
In `apps/panel/src/features/_reception-row.tsx`:
- Render compact row layout: `[Full Name]` | `[Grade Badge]` | `[Masked Phone]` | `[Session Badge / Warning with DangerCircleIcon]` | `[Checkin Button with UserCheckIcon]`.
- Support `isSelected: boolean` visual active state for keyboard navigation.

- [ ] **Step 2: Add keyboard selection and single-result auto-advance**
In `reception.tsx`:
- Search input has `<MagnifierIcon className="size-5 text-muted" />` adornment.
- Walk-in button has `<UserPlusIcon className="size-4" />`.
- Maintain `selectedIndex: number`.
- If `students.length === 1`, pressing `Enter` on the search input immediately calls `checkIn(students[0].id)`.
- If `students.length > 1`, `ArrowDown` and `ArrowUp` increment/decrement `selectedIndex`, and `Enter` checks in the selected student.
- Upon successful check-in, automatically clear search query and refocus `searchRef.current`.

- [ ] **Step 3: Verify check-in flow and keyboard behavior**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel test`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/panel/src/features/reception.tsx apps/panel/src/features/_reception-row.tsx
git commit -m "feat(reception): implement compact rows, solar icons and keyboard-first check-in flow"
```

---

### Task 9: Reception Walk-in 409 Namesake Resolution Flow & Form Icons

**Files:**
- Modify: `apps/panel/src/features/reception.tsx:370-435`

**Interfaces:**
- Consumes: `candidates: ReceptionStudent[]`, `form`, `checkIn(id: number)`.
- Produces: Clear candidate disambiguation and actionable namesake guidance.

- [ ] **Step 1: Enhance 409 candidates section in Walk-in modal**
In `reception.tsx`:
- Render found candidates with full name, masked phone, and «ثبت حضور همین فرد» button.
- Add clear callout for true namesakes:
  *«اگر این شخص مهمان جدیدی با تشابه اسمی است، لطفاً در فیلد نام‌خانوادگی مشخصه تمایز (مانند نام پدر یا پسوند) را درج فرمایید تا در سامانه تفکیک شود.»*
- Preserve form inputs (`firstName`, `lastName`, `grade`, phones) so the user does not have to retype everything.

- [ ] **Step 2: Verify Walk-in modal interactions**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel test`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add apps/panel/src/features/reception.tsx
git commit -m "feat(reception): add clear namesake disambiguation flow to walk-in modal"
```

---

### Task 10: Teacher Class Roster Live Filter, Compact Rows, Solar Icons & State Rollback

**Files:**
- Modify: `apps/panel/src/features/teacher.tsx:18-285`
- Create: `apps/panel/src/features/_teacher-student-row.tsx`

**Interfaces:**
- Consumes: `TeacherRoster`, `updateTeacherStudent`, Solar Icons (`PhoneIcon`, `MagnifierIcon`, `CheckSquareIcon`, `TrashIcon`, `CheckCircleIcon`, `StopwatchIcon`).
- Produces: Instant live client-side search, compact student row with icons, and network error state rollback.

- [ ] **Step 1: Create `TeacherStudentRow` component**
In `apps/panel/src/features/_teacher-student-row.tsx`:
- Render compact single-line student row with student name, telephone click-to-call link with `<PhoneIcon className="size-4" />`, status chip, and contextual action buttons («تأیید جذب» with `<CheckSquareIcon className="size-4" />` / «حذف از روند» with `<TrashIcon className="size-4" />`).

- [ ] **Step 2: Add instant search filter to Teacher roster**
In `teacher.tsx`:
- Add `search: string` state.
- In roster header, render instant search input with `<MagnifierIcon className="size-4 text-muted" />` filtering `filteredStudents` by first name, last name, or mobile.
- In tabs, display:
  * referred_to_teacher: `<StopwatchIcon className="size-4" />`
  * absorbed: `<CheckCircleIcon className="size-4" />`
  * removed: `<TrashIcon className="size-4" />`
- Add state rollback: if `save()` throws an error, revert optimistic roster change to previous snapshot and display clear error notice.

- [ ] **Step 3: Verify Teacher panel filtering and rollback**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel test`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/panel/src/features/teacher.tsx apps/panel/src/features/_teacher-student-row.tsx
git commit -m "feat(teacher): add live roster filter, compact rows, solar icons, and state rollback"
```

---

### Task 11: Reusable Theme-Consistent `PanelSelect` Component with Custom Chevron

**Files:**
- Create: `apps/panel/src/components/panel-select.tsx`
- Modify: `apps/panel/src/features/invitation.tsx:135-158`
- Modify: `apps/panel/src/features/reception.tsx:184-230`

**Interfaces:**
- Consumes: `{ value: string, label: string, isFilling?: boolean }[]`, `onChange: (val: string) => void`, `ChevronDownIcon` from `components/icons`.
- Produces: Accessible, HeroUI-styled selector with custom RTL chevron, Vazirmatn typography, and filling status badge.

- [ ] **Step 1: Implement `PanelSelect` component**
In `apps/panel/src/components/panel-select.tsx`:
- Build a custom styled select component with HeroUI border, focus ring, surface background, and clean `<ChevronDownIcon className="size-4 text-muted pointer-events-none" />`.
- Support optional `badge` or `isFilling` chip for active sessions.

- [ ] **Step 2: Replace raw `<select>` in Invitation and Reception**
Replace native `<select id="ceremony-select">`, `<select id="reception-ceremony">`, and `<select id="reception-session">` with `PanelSelect`.

- [ ] **Step 3: Verify styling and accessibility**
Run: `pnpm --filter @rasad/panel typecheck && pnpm --filter @rasad/panel build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add apps/panel/src/components/panel-select.tsx apps/panel/src/features/invitation.tsx apps/panel/src/features/reception.tsx
git commit -m "feat(panel): create reusable PanelSelect with solar chevron and replace raw select elements"
```

---

### Task 12: End-to-End Build & Automated Verification

**Files:**
- Test: `apps/panel/tests/api.test.ts`
- Run: Monorepo test suites

- [ ] **Step 1: Run panel typecheck**
Run: `pnpm --filter @rasad/panel typecheck`
Expected: PASS (0 errors).

- [ ] **Step 2: Run panel linter**
Run: `pnpm --filter @rasad/panel lint`
Expected: PASS (0 warnings, 0 errors).

- [ ] **Step 3: Run panel unit tests**
Run: `pnpm --filter @rasad/panel test`
Expected: PASS (11/11 tests passing).

- [ ] **Step 4: Run production build**
Run: `pnpm --filter @rasad/panel build`
Expected: PASS (Vite bundles successfully with tree-shaken solar icons).
