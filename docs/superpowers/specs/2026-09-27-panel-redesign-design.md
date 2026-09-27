# Design Spec: Rasad SRM Custom Panel Redesign

## 1. Overview & Goals

Rasad is an internal Student Relationship Management (SRM) system. `apps/panel` is a single Vite SPA built with React 19, TanStack Router, HeroUI v3, and Tailwind CSS v4 that hosts three operational task panels:
- `/invite` — High-throughput sequential calling workstation.
- `/reception` — Fast ceremony arrival search and walk-in check-in.
- `/teacher` — Primary teacher class roster and student lifecycle confirmation.

The current implementation in `apps/panel` relies on crude HTML elements (`<select>`, raw `<input>`, `<textarea>`) and custom CSS overrides in `app.css` that conflict with HeroUI v3's design system. This spec establishes a complete, ergonomic redesign leveraging native HeroUI v3 compound components, semantic tokens, and keyboard-first accessibility, while strictly respecting domain business invariants.

---

## 2. Core Principles & Constraints

1. **HeroUI v3 Guideline as Ground Truth:**
   - Use HeroUI v3 compound components (`Card.Header`, `TextField`, `Modal`, `Tabs`, `Button`, `Chip`, `Alert`).
   - NEVER override HeroUI theming variables or inject custom CSS fighting internal HeroUI slots.
   - Use HeroUI semantic variants (`primary`, `secondary`, `tertiary`, `danger`, `outline`, `soft`) instead of raw ad-hoc colors.
2. **Clean RTL & Persian Typography:**
   - RTL layout throughout the app (`dir="rtl"`).
   - Jalali calendar formatting for all operator-facing dates/times.
   - Phone inputs formatted in `dir="ltr"` with `<bdi>` wrappers on display.
3. **High-Throughput Operational Ergonomics:**
   - `/invite`: Replace the slow `<select>` outcome picker with 4 large semantic action buttons and keyboard hotkeys (1, 2, 3, 4).
   - `/reception`: Hero search bar with auto-refocus, 1-click check-in, and a dedicated HeroUI `Modal` for walk-in registration with inline 409 duplicate candidate resolution.
   - `/teacher`: HeroUI `Tabs` for status filtering with counter `Badge`s; clean modal confirmation dialog for absorbing or removing students with required reason.
4. **Domain Invariants:**
   - No session capacity counters or grade filtering in sessions.
   - Sequential filling: exactly one session is `filling` per ceremony.
   - Reception attendance is reality-based and does not alter invitation history.
   - Restricted users attempting to enter panels receive an actionable `Alert` with a link to Payload Admin (`/admin`).

---

## 3. Architecture & File Breakdown

### 3.1. Styling Foundation (`apps/panel/src/styles/app.css`)
- Retain only:
  - `@import 'tailwindcss';`
  - `@import '@heroui/styles';`
  - Base body setup (`font-family`, `background: var(--background)`, `color: var(--foreground)`).
  - Shell container layout classes (`max-w-5xl mx-auto p-4`).
- Remove all element-level tag overrides (`select`, `textarea`, `h1`, `h2`, `header`, `label`, `.notice`, `.surface`) so HeroUI v3 handles its own styling, borders, focus rings, and transitions.

### 3.2. Shared UI Primitives (`apps/panel/src/components/ui.tsx`)
- **`Field`**: HeroUI `TextField` with `Label`, `Input`, and `FieldError`.
- **`TextareaField`**: HeroUI `TextField` or textarea wrapper with `Label` and `TextArea`.
- **`ErrorAlert`**: HeroUI `Alert` with `variant="danger"`.
- **`SuccessAlert`**: HeroUI `Alert` with `variant="success"`.
- **`StatusChip`**: Standardized HeroUI `Chip` for lifecycle, invitation, and session statuses.

### 3.3. Shell & Top Navigation (`apps/panel/src/routes/_authenticated.tsx`)
- Modern operational header:
  - Brand title «رصد» with badge/chip indicating the active role (e.g. «مسئول دعوت»، «پذیرش مراسم»، «مدرس»).
  - Current user phone number display.
  - Logout action button (`Button variant="outline" size="sm"`).
  - Clean error banner if session operations fail.

### 3.4. Login Route (`apps/panel/src/routes/login.tsx`)
- Centered HeroUI `Card` with branded title.
- Phone number input with `type="tel"`, `inputMode="numeric"`, `dir="ltr"`.
- Password input with `type="password"`.
- If redirected with `reason=admin_restricted`, render a HeroUI `Alert variant="warning"` with an explicit button: «ورود به پنل مدیریت».

### 3.5. Invitation Feature (`apps/panel/src/features/invitation.tsx`)
- **Header Context Card**:
  - Ceremony selector dropdown (cleanly styled).
  - Current filling session tag with Jalali date and start time.
  - "Next student" claim button.
- **Dominant Calling Card (`Card`)**:
  - Student full name in prominent typography.
  - Telephone actions: buttons for student, mother, father with single-click `tel:` link.
  - Expiration timer badge showing lease deadline (`expiresAt`).
  - Optional quick note textarea.
- **4-Outcome Matrix**:
  - **پذیرفت (Accepted)**: `Button variant="primary"` (Green / Accent) — hotkey `1`.
  - **سانس دیگری می‌خواهد (Needs Alternative)**: `Button variant="secondary"` (Warning / Amber) — hotkey `2`.
  - **پاسخ نداد؛ ارسال پیامک (No Answer + SMS)**: `Button variant="outline"` — hotkey `3`.
  - **دعوت ناموفق (Failed)**: `Button variant="danger"` — hotkey `4`.
- **Queue Count Preview**:
  - Non-browsable status indicator showing remaining eligible queue count.

### 3.6. Reception Feature (`apps/panel/src/features/reception.tsx`)
- **Sticky Context Header**:
  - Selected ceremony and admitting session with Jalali timestamp.
- **Search Command Bar**:
  - HeroUI `SearchField` or input group with clear icon, auto-focused.
  - Action buttons: «جست‌وجو» and «دانش‌آموز جدید (مهمان)».
- **Search Results Cards**:
  - Student name, grade `Chip`, phone snippet.
  - Status indicator:
    - Already checked in: disabled button + «قبلاً پذیرش شده».
    - Invited to current session: ready for 1-click check-in.
    - Invited to different session: warning notice + allowed 1-click check-in.
- **Walk-in Registration Modal (`Modal`)**:
  - HeroUI `Modal` opened by «دانش‌آموز جدید».
  - First name, last name, optional grade, optional phones.
  - On 409 Conflict: renders potential duplicate candidates inside the modal with a 1-click «ثبت حضور همین دانش‌آموز» button.
  - After success: auto-focus returns to the main search bar.

### 3.7. Teacher Feature (`apps/panel/src/features/teacher.tsx`)
- **Class Context**:
  - Class selector if multiple classes assigned to teacher.
  - Roster summary counters.
- **HeroUI `Tabs` for Lifecycle States**:
  - Tab 1: **به مدرس معرفی شده** with badge showing pending count.
  - Tab 2: **جذب شده** (Absorbed).
  - Tab 3: **حذف شده** (Removed with reason).
- **Student Roster Cards**:
  - Name, mobile link, referral date.
  - Action buttons:
    - «تأیید جذب» (`Button variant="primary"`).
    - «حذف از روند» (`Button variant="danger" variant="outline"`).
- **Action Confirmation Dialog (`Modal`)**:
  - Absorption confirmation modal.
  - Removal confirmation modal requiring a non-empty «دلیل حذف» (`TextArea`).

---

## 4. Error Handling & Edge Cases

1. **Expired Queue Lease in `/invite`**:
   - If the operator submits after `expiresAt`, show actionable error alert and offer a reload button without wiping entered notes.
2. **Session Advanced During Calling**:
   - If the filling session changes mid-call, explain that the session was advanced and require confirmation against the new context.
3. **Network & Session Disconnection**:
   - Graceful alert banner; do not crash component tree.
4. **Duplicate Candidate Detection in `/reception`**:
   - Explicitly handle HTTP 409 and candidate arrays gracefully inside the modal.

---

## 5. Verification Plan

1. **Type Checking:** Run `pnpm -F @rasad/panel typecheck` to verify complete TypeScript strictness.
2. **Linting:** Run `pnpm -F @rasad/panel lint` with zero warnings.
3. **Unit / Integration Tests:** Run `pnpm -F @rasad/panel test` to ensure existing and updated tests pass.
4. **Visual & Keyboard Testing:**
   - Verify RTL layout, font rendering, and contrast ratios.
   - Verify keyboard hotkeys in `/invite` (1-4) and search focus in `/reception`.
