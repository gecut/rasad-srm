# CEREMONY OPERATIONS

## 1. Why v2 changed

Invitation is no longer built around independent grade/capacity Sessions. The operational goal is to fill a Ceremony's Sessions sequentially so one Session is not left partially populated while later Sessions receive successful invites.

## 2. Session ordering

Within one Ceremony, non-cancelled Sessions are ordered by `startsAt ASC`.

Default state after setup:

- earliest ready Session → `filling`;
- later ready Sessions → `queued`.

Only one Session may be `filling`.

## 3. What “fill” means

A successful `accepted` Invitation is assigned to the current `filling` Session.

There is no Session capacity number. Therefore the system cannot infer “full” automatically.

An authorized operator decides when a Session has enough accepted Students and invokes **Advance Session**.

## 4. Advance Session action

`advanceCeremonySession(ceremonyId)`:

- validates role;
- locks/re-reads current state;
- marks current `filling` Session as `sealed`;
- selects next chronological `queued` Session;
- marks it `filling`;
- sets `fillingStartedAt`;
- fails safely if state changed concurrently.

If no queued Session remains, the Ceremony has no invitation destination until a new Session is added or an existing one is reopened by an authorized operator.

## 5. Invitation queue

The queue is Ceremony-wide and derived, not persisted as its own business collection.

Recommended MVP priority:

1. Students who previously requested another Session and are now re-eligible because a new Session began filling;
2. never-processed Students;
3. stable deterministic tie-breaker.

The system auto-claims the next item. The inviter should not freely pick arbitrary Students because that defeats deterministic flow and complicates concurrency.

## 6. UI model

Best operator UX:

- top bar: Ceremony + current filling Session + start time;
- dominant current Student card;
- compact “next in queue” preview (for context only);
- outcome actions;
- no Session picker on accepted result.

This keeps the useful visibility of a list without allowing queue fragmentation.

## 7. Alternative Session behavior

When a Student cannot attend the current Session but may attend another:

- outcome = `needs_alternative_session`;
- no Session assignment is created;
- the Student is suppressed while the same Session remains filling;
- after Session advancement, the Student is prioritized back into the queue.

## 8. Concurrency

Two separate atomic concerns remain:

- queue item claim/lease so two inviters do not call the same Student simultaneously;
- accepted commit must verify the same Session is still `filling` before assigning it.

If the Session advanced while the inviter was calling, the server returns a domain error and keeps the card so the inviter can confirm the new situation rather than silently assigning the wrong Session.
