# Panel UI/UX Redesign with HeroUI v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely redesign and modernize `apps/panel` using native HeroUI v3 compound components, semantic tokens, and high-throughput operational UX workflows without overriding HeroUI theming.

**Architecture:** Replace crude HTML elements and ad-hoc CSS overrides with native HeroUI compound components (`Card`, `TextField`, `Modal`, `Tabs`, `Button`, `Chip`, `Alert`). Introduce task-focused, keyboard-first operational UX across `/invite`, `/reception`, `/teacher`, and the authentication shell.

**Tech Stack:** React 19, HeroUI v3 (`@heroui/react` 3.2.6, `@heroui/styles` 3.2.6), Tailwind CSS v4, TanStack Router, TypeScript.

**Spec:** [docs/superpowers/specs/2026-09-27-panel-redesign-design.md](file:///Users/mm25zamanian/Codes/rasad-srm/docs/superpowers/specs/2026-09-27-panel-redesign-design.md)

## Global Constraints

- Never override HeroUI theming variables or inject custom CSS fighting internal HeroUI slots.
- All panels use HeroUI semantic variants (`primary`, `secondary`, `tertiary`, `danger`, `outline`, `soft`).
- RTL layout and Persian typography with Jalali date formatting.
- No capacity counters or grade filtering in sessions.
- Sequential session filling: exactly one session is `filling` per ceremony.
- Fast walk-in modal with 409 duplicate candidate resolution in `/reception`.
- Lifecycle status tabs with modal confirmations in `/teacher`.

## Review Focus

- Expired invitation claim token handling in `/invite` without wiping entered notes.
- Session advancement mid-call notification in `/invite`.
- Duplicate phone/name candidate resolution (409 Conflict) inside the walk-in modal in `/reception`.
- Required reason validation when removing a student in `/teacher`.
- Clean redirect and admin link presentation for `admin_restricted` roles.

---

### Task 1: Styling Foundation Cleanup & Shared UI Primitives

**Files:**

- Modify: `apps/panel/src/styles/app.css`
- Modify: `apps/panel/src/components/ui.tsx`

**Interfaces:**

- Consumes: `@heroui/react` components (`TextField`, `Input`, `Label`, `FieldError`, `Alert`, `AlertTitle`, `AlertDescription`, `Chip`, `Card`, `Button`).
- Produces:
  - `Field({ label, value, onChange, type, required, name, placeholder, dir })`
  - `TextareaField({ label, value, onChange, rows, placeholder, required })`
  - `ErrorNotice({ message, title })`
  - `SuccessNotice({ message, title })`
  - `StatusChip({ status, label, variant })`

- [x] **Step 1: Clean `apps/panel/src/styles/app.css`**
      Remove all ad-hoc tag selectors (`select`, `textarea`, `h1`, `h2`, `header`, `label`, `.notice`, `.surface`) that fight HeroUI styling. Keep `@import 'tailwindcss';`, `@import '@heroui/styles';`, and clean layout utilities.

- [x] **Step 2: Rewrite `apps/panel/src/components/ui.tsx` with HeroUI v3 Primitives**
      Implement `Field`, `TextareaField`, `ErrorNotice`, `SuccessNotice`, and `StatusChip` using compound HeroUI v3 components.

- [x] **Step 3: Verify TypeScript and Linting**
      Run: `pnpm -F @rasad/panel typecheck && pnpm -F @rasad/panel lint`
      Expected: PASS with 0 errors and 0 warnings.

- [x] **Step 4: Commit**

```bash
git add apps/panel/src/styles/app.css apps/panel/src/components/ui.tsx
git commit -m "style(panel): clean styling foundation and add HeroUI v3 shared primitives"
```

---

### Task 2: Auth Shell & Login Screen Modernization

**Files:**

- Modify: `apps/panel/src/routes/_authenticated.tsx`
- Modify: `apps/panel/src/routes/login.tsx`

**Interfaces:**

- Consumes: `session`, `isOperationalRole`, `operationalHome` from `apps/panel/src/lib/auth.ts`, `Field`, `ErrorNotice` from `apps/panel/src/components/ui.tsx`.
- Produces:
  - Upgraded Shell with user identity, role badge, clean header, and logout action.
  - Upgraded Login screen with branded Card, phone input with numeric mode, and admin redirect Alert.

- [x] **Step 1: Modernize `apps/panel/src/routes/_authenticated.tsx`**
      Add operational role display (`مسئول دعوت`, `پذیرش مراسم`, `مدرس`), phone number chip, and HeroUI `Button` for logout.

- [x] **Step 2: Modernize `apps/panel/src/routes/login.tsx`**
      Refactor login form into a clean HeroUI `Card` with `TextField`, numeric keypad hints, and warning `Alert` with direct button link to Payload Admin when `admin_restricted`.

- [x] **Step 3: Run existing auth and routing tests**
      Run: `pnpm -F @rasad/panel test`
      Expected: PASS (all 11 tests).

- [x] **Step 4: Commit**

```bash
git add apps/panel/src/routes/_authenticated.tsx apps/panel/src/routes/login.tsx
git commit -m "feat(panel): modernize login screen and authenticated shell with HeroUI v3"
```

---

### Task 3: High-Throughput Invitation Workstation Feature (`/invite`)

**Files:**

- Modify: `apps/panel/src/features/invitation.tsx`

**Interfaces:**

- Consumes: `/panel/context`, `/panel/invite/claim`, `/panel/invite/submit` API endpoints.
- Produces:
  - Context Banner with active ceremony and filling session status.
  - Dominant Student Card with single-click telephone call actions (`tel:`).
  - 4-Outcome Matrix with HeroUI semantic buttons (`accepted`, `needs_alternative_session`, `no_answer_sms`, `failed`).
  - Keyboard hotkeys (1, 2, 3, 4) for one-touch outcome registration.
  - Non-browsable queue summary badge.

- [x] **Step 1: Refactor `Invitation` Component in `apps/panel/src/features/invitation.tsx`**
      Implement the context banner, dominant student calling card, call buttons with `<bdi>` phone formatting, and the 4-button outcome matrix.

- [x] **Step 2: Add Keyboard Hotkeys Support (1 to 4)**
      Add a `useEffect` listener on keyboard keys `1`, `2`, `3`, `4` when a student claim is active and no textarea is focused, automatically triggering the corresponding outcome submission.

- [x] **Step 3: Verify TypeScript and Linting**
      Run: `pnpm -F @rasad/panel typecheck && pnpm -F @rasad/panel lint`
      Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add apps/panel/src/features/invitation.tsx
git commit -m "feat(panel): rebuild invitation workstation with 4-outcome matrix and hotkeys"
```

---

### Task 4: Lightning Check-in Reception Station Feature (`/reception`)

**Files:**

- Modify: `apps/panel/src/features/reception.tsx`

**Interfaces:**

- Consumes: `/panel/context`, `/panel/reception/search`, `/panel/reception/checkin`, `/panel/reception/walkin`.
- Produces:
  - Sticky Context Bar with ceremony and admitting session.
  - Command Search Bar with auto-refocus after check-in.
  - Search results with HeroUI `Card`, grade `Chip`, and 1-click check-in.
  - Dedicated Walk-in Registration HeroUI `Modal` with 409 conflict candidate picker.

- [x] **Step 1: Refactor Search and Check-in Result Cards in `apps/panel/src/features/reception.tsx`**
      Implement sticky context bar, search field with clear action, and clean result cards distinguishing already checked-in students and different session warnings.

- [x] **Step 2: Implement Walk-in Registration `Modal` with 409 Candidate Resolution**
      Move walk-in creation into a HeroUI `Modal`. If API returns status 409 with `candidates`, display them inside the modal with a one-click "ثبت حضور همین دانش‌آموز" button.

- [x] **Step 3: Ensure Focus Management**
      Verify that after check-in completion, the search query clears and the search input receives focus automatically.

- [x] **Step 4: Verify TypeScript and Linting**
      Run: `pnpm -F @rasad/panel typecheck && pnpm -F @rasad/panel lint`
      Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add apps/panel/src/features/reception.tsx
git commit -m "feat(panel): rebuild reception station with modal walk-in and duplicate resolution"
```

---

### Task 5: Teacher Class Roster Hub Feature (`/teacher`)

**Files:**

- Modify: `apps/panel/src/features/teacher.tsx`

**Interfaces:**

- Consumes: `/panel/teacher`, `/panel/teacher/status`.
- Produces:
  - Class selector and summary metrics.
  - HeroUI `Tabs` for status filtering (`referred_to_teacher`, `absorbed`, `removed`) with count `Badge`s.
  - Student roster cards with quick actions.
  - Action confirmation `Modal` with mandatory reason for removal.

- [x] **Step 1: Implement Tabs and Student Cards in `apps/panel/src/features/teacher.tsx`**
      Replace raw `<select>` filter with HeroUI `Tabs` and badges. Render roster cards with student name, telephone link, and action triggers.

- [x] **Step 2: Implement Modal Confirmation Dialogs for Absorption and Removal**
      Use HeroUI `Modal` for confirming absorption and prompting for required removal reason with HeroUI `TextArea`.

- [x] **Step 3: Verify TypeScript and Linting**
      Run: `pnpm -F @rasad/panel typecheck && pnpm -F @rasad/panel lint`
      Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add apps/panel/src/features/teacher.tsx
git commit -m "feat(panel): rebuild teacher panel with status tabs and modal confirmations"
```

---

### Task 6: End-to-End Verification & Verification Suite

**Files:**

- Test: `apps/panel/tests/api.test.ts`

- [x] **Step 1: Run Full Test Suite**
      Run: `pnpm -F @rasad/panel test`
      Expected: All tests pass.

- [x] **Step 2: Run Strict Typecheck and Lint**
      Run: `pnpm -F @rasad/panel typecheck && pnpm -F @rasad/panel lint`
      Expected: 0 errors, 0 warnings.

- [x] **Step 3: Run Vite Build**
      Run: `pnpm -F @rasad/panel build`
      Expected: Production build succeeds without bundle errors.
