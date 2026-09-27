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

## 4. Persian/RTL

- Persian copy by default;
- RTL layout;
- Persian/Jalali schedule presentation;
- accept Persian and Latin digits in phone/date inputs where practical;
- store normalized canonical values server-side.

## 5. Date/time

Operator-facing Ceremony/Session scheduling uses Jalali calendar and explicit time. Persist ISO date-time values; never persist only a localized display string.

## 6. Invitation UX

- current Ceremony and filling Session always visible;
- one dominant Student card;
- small upcoming queue preview permitted;
- large explicit result actions;
- no Session picker for accepted result;
- no capacity display.

## 7. Teacher UX

- Class context obvious;
- referred and absorbed Students easy to scan;
- status actions constrained to allowed transitions;
- no full edit form.

## 8. Reception UX

- search box is the primary control;
- results must distinguish namesakes;
- one-click check-in;
- obvious quick-create fallback;
- after check-in, return focus to search.

## 9. Forms/errors

Validate near fields and again on server. Preserve input on recoverable failure. Guard duplicate submissions.

## 10. Accessibility

Text labels in addition to color, visible focus, keyboard reachability, reduced-motion respect, and accessible HeroUI/React Aria primitives.
