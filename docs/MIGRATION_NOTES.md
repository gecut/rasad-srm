# MIGRATION NOTES — v1 → v2

This file lists expected breaking changes before code edits.

## 0. Workspace relocation

Move the existing Payload/Next code and tests into `apps/cms` before domain changes. Preserve source and test coverage. `packages/contracts` owns generated types; one `apps/panel` Vite SPA owns all custom panels. Use pnpm only and same-origin routing. No database mutation is required for relocation.

## 1. Terminology / collection

Preferred end state: `contacts` → `students`.

If renaming the physical collection immediately is operationally risky, a temporary migration may preserve the old DB table/slug while code-facing domain modules and Admin labels move to Student. Do not keep two canonical collections.

## 2. Lifecycle enum mapping

| v1             | v2                    |
| -------------- | --------------------- |
| `unknown`      | `unknown`             |
| `interested`   | `class_seeker`        |
| `in_follow_up` | `referred_to_teacher` |
| `stabilizing`  | `absorbed`            |
| `stabilized`   | `stabilized`          |
| `stopped`      | `removed`             |

Recommended date mapping:

- `referredAt` remains;
- `firstAttendanceAt` → `absorbedAt` if its prior meaning matches actual Class entry;
- `stabilizedAt` remains;
- `stopReason` → `removedReason`.

## 3. Classes

Add `transition_to_preliminaries` enum value.

## 4. Sessions

Remove/deprecate:

- `grade`;
- `capacity`;
- derived accepted/remaining capacity logic;
- `full` status.

Add:

- `queued`, `filling`, `sealed` states;
- `fillingStartedAt`.

Existing Sessions need an explicit initial ordering/state assignment per Ceremony.

## 5. Invitations

Remove `contactTarget`.

Change semantics from per Student+Session attempt to current Student+Ceremony record. Introduce `assignedSession` only for accepted outcome.

Existing invitation data migration requires a policy:

- group by Student + Ceremony;
- preserve the latest/current result;
- preserve accepted assigned Session;
- optionally convert prior rows into embedded `attempts` history.

Do not run this migration blindly without a backup and a test migration on copied data.

## 6. Users / Teacher auth

Add roles `teacher`, `receptionist`. Enable username auth. Custom-panel phone is stored in normalized `username`.

Existing Admin users continue to use email login if configured.

Teacher accounts link to existing Teacher records through `teacherProfile`.

## 7. Reception

Create `session-checkins` collection with unique Student + Session rule.

## 8. Jalali dates

Do not migrate stored Gregorian/ISO date-time values to Persian strings. Only UI input/display changes.

## 9. Code search checklist

Before implementation, search repository for:

- `contact`, `contacts`, `Contact`;
- `interested`, `in_follow_up`, `stabilizing`, `stopped`;
- Session `grade`, `capacity`, `full`;
- `contactTarget`;
- accepted/remaining capacity calculations;
- teacher-is-not-user assumptions;
- routes restricted to only `/invite` custom panel.

## 10. Implemented migration and deployment runbook

`apps/cms/src/migrations/20260924_083051_v1_baseline.ts` initializes an empty database or validates required v1 columns before adopting an existing v1 database. It does not blindly recreate existing data. `20260924_090000_v2_student_workflows.ts` upgrades v1 in one transaction.

The upgrade preserves Student IDs and relationship links, maps lifecycle/date fields, archives original Contacts/Sessions/Invitations/claims/jobs in `rasad_v1_archive`, and collapses invitation attempts into one ceremony record with JSON history. An accepted result wins over non-accepted attempts; among equivalent results the latest timestamp/ID wins. Multiple distinct accepted Sessions for the same Student/Ceremony **abort the migration**. Pending SMS jobs also abort; drain or deliberately resolve them before retrying. Historical job references and locked-document invitation references are remapped to retained IDs.

Old `open` Sessions are ordered by startsAt/id: first becomes `filling`, later ones `queued`; `full` and `closed` become `sealed`. Claims expire by removal during migration. Username stays empty for existing accounts; provision normalized mobile usernames for operational users before they use panels. No password hash is changed. Old grade/capacity/contactTarget data remains in the archive rather than in operational v2 fields.

Before upgrade:

1. stop v1 app/worker writes;
2. take and verify a full PostgreSQL backup;
3. restore it to a separate rehearsal database;
4. run `pnpm migrate`, inspect migration results, reconcile conflicts and check record counts/relationships;
5. restore or attach the authoritative data to the production PostgreSQL volume before deployment;
6. run the one-off Compose `migrate` service and confirm exit code 0; only then start one CMS replica with schema push disabled, verify, then scale.

`docker-compose.production.yml` gates CMS startup on successful completion of `migrate`, which runs `payload migrate` from the matching migration image. CMS retains bundled `prodMigrations` as an idempotent startup check. Do not run old v1 code against the upgraded database. The v2 down migration intentionally refuses destructive reversal: restore the verified backup for rollback. The archive is retained and must not be deleted without a separate retention decision.
