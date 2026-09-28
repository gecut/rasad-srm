# UX RULES

## 1. General

Optimize internal operations for clarity, speed, predictable behavior, low cognitive load, RTL, and keyboard usability.

## 2. Surfaces

- CRUD/management → Payload Admin.
- sequential invitation → `/invite`.
- primary-Teacher decisions → `/teacher`.
- ceremony arrival/search/check-in → `/reception`.

## 3. Custom-panel design system

All custom panels use HeroUI v3 + Tailwind CSS v4 + shared semantic tokens. React 19+ baseline. All three panels live in one `apps/panel` Vite SPA with TanStack Router; management remains in `apps/cms` Payload Admin.
Icons are standardized on `@solar-icons/react` (`linear` family) via tree-shakable subpath imports (`@solar-icons/react/linear/<kebab-name>`); root barrel imports are banned to preserve small bundle size and instant Vite HMR.

## 4. Persian/RTL & Typography

- Persian copy by default;
- RTL layout and logical geometry;
- Persian/Jalali schedule presentation;
- Vazirmatn font loaded with `font-display: swap` across all views;
- Muted text calibrated for WCAG AA minimum 4.5:1 contrast;
- Phone numbers and codes displayed with explicit `dir="ltr"` and `<bdi>`;
- Accept Persian and Latin digits in phone/date inputs where practical;
- Store normalized canonical values server-side.

## 5. Date/time

Operator-facing Ceremony/Session scheduling uses Jalali calendar and explicit time. Persist ISO date-time values; never persist only a localized display string.

## 6. Invitation UX

- current Ceremony and filling Session always visible;
- one dominant Student card;
- live claim countdown timer badge (`MM:SS`) with 3 color phases: normal (> 2m), warning (<= 2m), and pulsing danger (<= 45s);
- on claim expiration, outcome actions safely freeze and a prominent "تمدید مهلت تماس" action is shown while preserving any typed notes;
- four outcome actions with hotkeys (1-4), strictly ignoring hotkeys inside input, textarea, and select controls;
- no Session picker for accepted result;
- no capacity display.

## 7. Teacher UX

- Class context obvious;
- live client-side search/filter by name or mobile in roster header;
- compact single-line student rows with click-to-call links;
- status actions constrained to allowed transitions (`referred_to_teacher → absorbed`, `referred_to_teacher/absorbed → removed`);
- removal requires mandatory reason;
- state rollback restores local roster snapshot if server mutation fails;
- no full edit form.

## 8. Reception UX

- search box is the primary control, keyboard-first;
- compact data rows (~48px height) replacing bulky repetitive cards;
- single-match search result checks in immediately on `Enter`;
- multiple search results navigate with `↑` / `↓` arrow keys and check in on `Enter`;
- after check-in, search input is cleared and automatically refocused;
- results clearly distinguish namesakes and highlight session mismatches;
- obvious quick-create fallback for walk-in guests;
- in walk-in 409 conflict, provide candidate quick check-in and clear guidance to disambiguate true namesakes by adding a differentiator (e.g. father's name or suffix) in the last name field.

## 9. Forms/errors & Selectors

- Ceremony and Session dropdowns use custom-styled, accessible `PanelSelect` components matching HeroUI tokens, replacing raw HTML `<select>` elements;
- Validate near fields and again on server. Preserve input on recoverable failure. Guard duplicate submissions.

## 10. Accessibility

Text labels in addition to color, visible focus rings, keyboard reachability, modal focus trap isolation (preventing background search hotkeys from stealing focus), reduced-motion respect, and accessible HeroUI/React Aria primitives.
