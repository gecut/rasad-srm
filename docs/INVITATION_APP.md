# INVITATION PANEL — `/invite`

## 1. Purpose

A focused high-throughput calling UI:

`receive next Student → call → register result → continue`

The queue is Ceremony-wide; the system assigns accepted Students to the current filling Session.

## 2. UI stack

- React 19+
- HeroUI v3
- Tailwind CSS v4
- Persian/RTL-first

## 3. Authentication

Inviter logs in with phone number + password. Server requires role `inviter` (or explicitly privileged Admin).

## 4. Main screen

Always show:

- Ceremony;
- current filling Session;
- Jalali date + time;
- current Student;
- available Student/mother/father phones;
- four outcome actions.

Do not record which phone target was used; `contactTarget` has been removed.

## 5. Queue presentation

Use one dominant current Student card plus a small read-only upcoming queue preview. Do not expose a fully browsable Student table by default.

The next card is claimed server-side. The inviter cannot choose an arbitrary Session.

## 6. Outcomes

### Accepted

Assign to current filling Session.

### Needs another Session

No assignment. Requeue only after Session advancement.

### No answer + SMS

Persist first, queue SMS, continue immediately.

### Failed

No SMS; Ceremony invitation becomes terminal in MVP.

## 7. Failure UX

If persistence/authorization/state validation fails:

- keep current card;
- keep entered intent;
- show actionable error;
- do not advance.

If Session changed while calling, explain that the active Session advanced and require a fresh confirmed submission against current context.

## 8. Do not add

- grade filters;
- Session capacity counters;
- inviter-selected Session assignment;
- arbitrary queue browsing;
- smart ranking;
- gamification;
- generic CRM dashboard.
