# Invitation Panel Redesign & Minimal Modal Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the cluttered, cockpit-like `/invite` tele-calling panel into an ultra-clean, minimal, and high-performance caller console utilizing HeroUI v3 semantic components, progressive disclosure modals, and rock-solid offline-ready Vazirmatn typography.

**Architecture:** Decompose the 579-line monolithic `apps/panel/src/features/invitation.tsx` into single-responsibility submodules (`_`-prefixed private components) adhering to `nexload-react` and `nexload-code`. Move secondary workflows (session capacity selector, student dossier/notes, call postpone, decline reasons) into dedicated HeroUI v3 modals, keeping the primary viewport 100% visible without vertical scrolling. Fix font degradation by installing `@fontsource/vazirmatn` and configuring Tailwind CSS v4 `@theme`.

**Tech Stack:** React 19, HeroUI v3.2+, Tailwind CSS v4.3+, `@fontsource/vazirmatn`, `@solar-icons/react` linear subpaths.

**Spec:** [`docs/superpowers/specs/2026-09-30-invitation-panel-redesign-design.md`](file:///Users/mm25zamanian/Codes/rasad-srm/docs/superpowers/specs/2026-09-30-invitation-panel-redesign-design.md)

## Global Constraints

- Do NOT overwrite or hack HeroUI theming with arbitrary CSS overrides; use pure semantic variants (`primary`, `secondary`, `outline`, `danger`, `soft`).
- Strictly adhere to `nexload-code` and `nexload-react`: kebab-case filenames, `_`-prefixed private submodules, named exports, pure render, and minimal local state.
- Vazirmatn font must load reliably offline and apply across all elements; numbers must format with `tabular-nums`.
- Keyboard shortcuts (1: Accept, 2: No Answer, 3: Decline Modal, 4: Postpone Modal) must remain instant and unhindered.
- Preserves all business rules: PostgreSQL row locking, 5-minute lease countdown with graceful expiration freeze, and note preservation on re-claim.

## Review Focus

1. **Font Loading Resilience:** If external CDN is blocked, does Vazirmatn still render cleanly from bundled fontsource?
2. **Keyboard Focus & Modal Trap:** When hotkey 1-4 or Escape is pressed, does focus stay inside the modal and prevent accidental double-submits?
3. **Session Selection State:** When a custom session is picked from `_session-select-modal.tsx`, does it accurately bind to the claim submit payload?
4. **Claim Expiration Freeze:** When timer reaches 00:00, are outcome actions disabled until the operator clicks re-claim?
5. **Screen Height & Zero Scroll:** Does the main calling screen fit entirely in a 1080p and laptop viewport without vertical scrollbar?

---

### Task 1: Self-Hosted Vazirmatn Font & Tailwind CSS v4 `@theme` Typography

**Files:**
- Modify: `apps/panel/package.json`
- Modify: `apps/panel/src/styles/app.css`
- Modify: `apps/panel/index.html`

**Interfaces:**
- Consumes: `@fontsource/vazirmatn`
- Produces: Resilient local typography and `@theme` configuration for Tailwind v4.

- [ ] **Step 1: Install `@fontsource/vazirmatn` in `apps/panel`**
  Run: `pnpm --filter @rasad/panel add @fontsource/vazirmatn`
  Expected: Package installed in `apps/panel/package.json`.

- [ ] **Step 2: Update `apps/panel/src/styles/app.css` with `@theme` and font import**
  Import `@fontsource/vazirmatn/300.css`, `400.css`, `500.css`, `600.css`, `700.css`.
  Define `@theme` block:
  ```css
  @theme {
    --font-sans: 'Vazirmatn', system-ui, -apple-system, sans-serif;
    --font-mono: 'Vazirmatn', monospace;
  }
  ```
  Ensure `tabular-nums` class is available for numbers and timer.

- [ ] **Step 3: Clean up Google Fonts link in `apps/panel/index.html`**
  Remove the external Google Fonts `<link>` since fonts are now self-hosted and offline-ready.

- [ ] **Step 4: Verify build**
  Run: `pnpm --filter @rasad/panel build`
  Expected: Build succeeds with code 0.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/panel/package.json apps/panel/src/styles/app.css apps/panel/index.html pnpm-lock.yaml
  git commit -m "style(panel): add self-hosted vazirmatn and tailwind v4 theme"
  ```

---

### Task 2: Refactor Timer & Create Session Selection Modal

**Files:**
- Modify: `apps/panel/src/features/_invitation-timer.tsx`
- Create: `apps/panel/src/features/_session-select-modal.tsx`

**Interfaces:**
- Consumes: `SessionSummary[]` from `@rasad/contracts`, HeroUI `Modal`, `Card`, `Chip`.
- Produces: `SessionSelectModal({ isOpen, onOpenChange, sessions, selectedSessionId, onSelect })`

- [ ] **Step 1: Refactor `_invitation-timer.tsx` with clean typography**
  Use `tabular-nums` and HeroUI semantic chip/badge with 3 phases (normal soft accent, warning, danger pulse).

- [ ] **Step 2: Create `apps/panel/src/features/_session-select-modal.tsx`**
  Implement the session selector using HeroUI compound `Modal`:
  - `Modal.Dialog` containing the list of available ceremony sessions.
  - Cards displaying session title, date/time, accepted count, and fill ratio percentage.
  - Active/Default badge.
  - Clear selection state and "تأیید و انتخاب این سانس" button.

- [ ] **Step 3: Verify component builds cleanly**
  Run: `pnpm --filter @rasad/panel build`
  Expected: Build succeeds with code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/panel/src/features/_invitation-timer.tsx apps/panel/src/features/_session-select-modal.tsx
  git commit -m "feat(panel): create session selection modal and refine timer"
  ```

---

### Task 3: Create Student Dossier Modal & Call Notes Modal

**Files:**
- Create: `apps/panel/src/features/_student-dossier-modal.tsx`
- Create: `apps/panel/src/features/_note-modal.tsx`

**Interfaces:**
- Consumes: `StudentCard` from `@rasad/contracts`, HeroUI `Modal`, `TextArea`.
- Produces:
  - `StudentDossierModal({ isOpen, onOpenChange, student })`
  - `NoteModal({ isOpen, onOpenChange, note, onSave })`

- [ ] **Step 1: Implement `_student-dossier-modal.tsx`**
  Display student details that don't need to crowd the main screen:
  - Referrer info and dossier notes (`student.notes`).
  - History of past ceremony check-ins (`recentCheckins`) with clean badges and dates.
  - Complete contact information breakdown.

- [ ] **Step 2: Implement `_note-modal.tsx`**
  Compact HeroUI modal for entering/editing call notes, saving without cluttering the main screen with a permanent 3-line textarea.

- [ ] **Step 3: Verify component builds cleanly**
  Run: `pnpm --filter @rasad/panel build`
  Expected: Build succeeds with code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/panel/src/features/_student-dossier-modal.tsx apps/panel/src/features/_note-modal.tsx
  git commit -m "feat(panel): add student dossier and call notes modals"
  ```

---

### Task 4: Create Postpone & Decline Reason Modals

**Files:**
- Create: `apps/panel/src/features/_postpone-modal.tsx`
- Create: `apps/panel/src/features/_decline-modal.tsx`

**Interfaces:**
- Consumes: HeroUI `Modal`, `Button`, `TextArea`.
- Produces:
  - `PostponeModal({ isOpen, onOpenChange, onConfirm, busy })`
  - `DeclineModal({ isOpen, onOpenChange, onConfirm, busy })`

- [ ] **Step 1: Implement `_postpone-modal.tsx`**
  Provide intuitive delay presets:
  - ۳۰ دقیقه دیگر (30m)
  - ۱ ساعت دیگر (1h)
  - ۲ ساعت دیگر (2h)
  - فردا صبح (Tomorrow morning)
  - Confirm button triggering `submitOutcome('postponed', targetDate)`.

- [ ] **Step 2: Implement `_decline-modal.tsx`**
  Provide quick decline reason tags (مسافت دور، عدم تمایل، مسافرت/تداخل، سایر) and optional explanation input before submitting terminal `declined` outcome.

- [ ] **Step 3: Verify component builds cleanly**
  Run: `pnpm --filter @rasad/panel build`
  Expected: Build succeeds with code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/panel/src/features/_postpone-modal.tsx apps/panel/src/features/_decline-modal.tsx
  git commit -m "feat(panel): add postpone and decline reason modals"
  ```

---

### Task 5: Create Streamlined Calling Hero & Invitation Header

**Files:**
- Create: `apps/panel/src/features/_invitation-header.tsx`
- Create: `apps/panel/src/features/_student-calling-hero.tsx`

**Interfaces:**
- Consumes: `InvitationQueue`, `SessionSummary`, HeroUI `Card`, `Button`, `Chip`, `Kbd`.
- Produces:
  - `InvitationHeader({ context, ceremony, onSelectCeremony, busy, onClaim, queue })`
  - `StudentCallingHero({ claim, selectedSession, onOpenSessionSelect, onOpenDossier, onOpenNote, hasNote, onOutcome, isExpired, busy })`

- [ ] **Step 1: Implement `_invitation-header.tsx`**
  Compact horizontal bar featuring ceremony `PanelSelect`, active session badge, and the primary "دریافت دانش‌آموز بعدی" button.

- [ ] **Step 2: Implement `_student-calling-hero.tsx`**
  The star of the redesign:
  - Clean card with zero nested sub-cards.
  - Prominent student name, grade chip, and neighborhood chip.
  - Sleek timer chip in the top corner.
  - **Phone pill bar:** Compact `tel:` links with phone icons and formatted digits.
  - **Selected session strip:** "سانس انتخابی: سانس اول (جمعه ۱۲ مرداد - ۱۲:۰۰)" + "تغییر سانس..." button opening the session modal.
  - **Dossier & Notes quick triggers:** Minimal links with badge count instead of bloated boxes.
  - **4 Outcome Action Buttons:** Compact 2x2 grid with native HeroUI variants (`primary`, `outline`, `danger`, `secondary`) and hotkey badges (1, 2, 3, 4).

- [ ] **Step 3: Verify components build cleanly**
  Run: `pnpm --filter @rasad/panel build`
  Expected: Build succeeds with code 0.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/panel/src/features/_invitation-header.tsx apps/panel/src/features/_student-calling-hero.tsx
  git commit -m "feat(panel): create minimal student calling hero and compact header"
  ```

---

### Task 6: Refactor `invitation.tsx` Orchestrator & Keyboard Shortcuts

**Files:**
- Modify: `apps/panel/src/features/invitation.tsx`

**Interfaces:**
- Orchestrates state, API calls, and connects all submodules.

- [ ] **Step 1: Refactor `invitation.tsx`**
  Wire `_invitation-header.tsx`, `_student-calling-hero.tsx`, and the 4 modals.
  Keep all keyboard hotkeys (1-4) functional and active when modals are closed.
  Ensure empty state alert and error/success banners are cleanly positioned.

- [ ] **Step 2: Verify build and types**
  Run: `pnpm --filter @rasad/panel build`
  Run: `pnpm --filter @rasad/panel typecheck`
  Expected: Both pass with 0 errors.

- [ ] **Step 3: Commit**
  ```bash
  git add apps/panel/src/features/invitation.tsx
  git commit -m "refactor(panel): orchestrate modular invitation caller console"
  ```

---

### Task 7: Comprehensive Verification & CTO Review Pre-Flight

**Files:**
- Tests & build verification across monorepo.

- [ ] **Step 1: Run panel build and lint**
  Run: `pnpm --filter @rasad/panel build`
  Run: `pnpm --filter @rasad/panel lint`
  Expected: 0 errors, 0 warnings.

- [ ] **Step 2: Run CMS typecheck and unit tests**
  Run: `pnpm --filter @rasad/cms typecheck`
  Run: `pnpm --filter @rasad/cms exec vitest run tests/unit/`
  Expected: 19/19 tests pass, 0 type errors.

- [ ] **Step 3: Pre-Flight Review checklist**
  - Vazirmatn font rendered offline
  - Zero cockpit clutter; main view fits in one screen
  - Keyboard navigation 1-4 intact
  - No theme overrides on HeroUI v3
  - Kebab-case filenames and `_`-prefixed private submodules

- [ ] **Step 4: Commit final documentation / updates if needed**
  ```bash
  git commit --allow-empty -m "chore(panel): complete invitation panel redesign verification"
  ```
