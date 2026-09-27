# Development seed

`pnpm seed:dev` creates synthetic Persian MVP scenarios without changing the schema or deleting existing records. Run from the repository root with Node 24.21.0 and pnpm 11.25.0.

## Payload-native execution

The repository pins Payload **3.89.0**. The command is registered through its documented `config.bin` API: `key: 'seed'`, with `scripts/seed-dev.ts` exporting `script(config: SanitizedConfig)`. The CLI loads the environment using Payload/Next conventions, loads TypeScript, and supplies the sanitized project configuration. The seed then initializes Payload and uses the existing Local API fixture transaction.

```sh
# Convenient root alias
pnpm seed:dev
# Equivalent native CLI command
pnpm --filter @rasad/cms exec payload seed
```

The standalone `dotenv`/`tsx` launcher has been removed from this seed entry point. Other repository scripts can still depend on those packages. Schema push and automatic jobs are disabled when building the configuration for this CLI command, even if the developer environment enables them. Target/argument validation runs before the Payload instance connects to the database. The entry point explicitly exits nonzero on failure because Payload 3.89's custom-bin dispatcher catches command errors; database connections are destroyed after execution.

### Research and choice

| Official mechanism              | Applicability here                                                                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.bin` + `payload seed`   | Selected: a named, explicit project command receiving sanitized config in Payload 3.x.                                                                                                                                                 |
| `payload run path/to/script.ts` | Valid standalone alternative with native environment/TypeScript loading. The installed 3.89 runner rewrites argv to positional arguments, making strict rejection of flags such as `--reset` unsuitable without an additional wrapper. |
| `onInit`                        | Startup hook; useful for initialization, but development fixtures should run only through the explicit seed command.                                                                                                                   |
| Database migrations             | Remain the mechanism for schema/data upgrades; development fixtures have a separate lifecycle.                                                                                                                                         |

Payload supplies the CLI, authentication, Local API, hooks and transaction facilities; fixture contents, idempotency and safety policy remain application code. No automatic domain-specific fixture generator is assumed. The choice was checked against the installed 3.89 CLI source as well as official docs; newer major-version CLI APIs should not be copied into this pinned project.

Sources: [Custom bin scripts](https://payloadcms.com/docs/configuration/overview#custom-bin-scripts), [Using Payload outside Next.js](https://payloadcms.com/docs/local-api/outside-nextjs), [Transactions](https://payloadcms.com/docs/database/transactions).

## Run

Create a local PostgreSQL database such as `rasad_srm_dev`. Configure `DATABASE_URL` and `PAYLOAD_SECRET` in `apps/cms/.env`, or supply them in the shell, then:

```sh
pnpm migrate
pnpm seed:dev
pnpm dev
```

The seed accepts only `localhost`, `127.0.0.1` or `::1`, with a database name starting `rasad` and ending `_dev` or `_test`. Production/live/staging names, remote hosts, connection URL options and non-development environment markers are rejected **before Payload initialization**. There is no override flag. Normal application database names such as `rasad_srm` deliberately fail this stricter seed check.

Only point this at a disposable local database; a local tunnel does not prove the underlying database is disposable. Migrations are a separate explicit command. The seed disables schema push and its own job runner.

## Repeat behavior

The complete fixture set is created in one PostgreSQL transaction under a seed lock. A failure rolls back every fixture write. Account collisions abort without overwriting existing accounts.

`admin@seed.rasad.invalid` is the completion marker, committed with the fixtures. A second run is a no-op: IDs, timestamps, passwords, manual edits and workflow progress stay unchanged. Do not remove or repurpose this marker. Existing tagged records without a marker cause an error instead of duplication. `--reset` and all other flags are intentionally unsupported. For a fresh scenario set with fresh dates, create another disposable local `_dev`/`_test` database and run migrations and the seed there.

## Accounts

Initial password for every account: **`RasadDev123!`**. These are public development credentials, never production accounts. Phone strings beginning `090000…` are synthetic placeholders; they are not claimed to be a reserved telecommunications range and must never be dialed or sent messages.

| Role                  | Phone / username | Email                            | Entry        |
| --------------------- | ---------------- | -------------------------------- | ------------ |
| Admin                 | `09000000001`    | `admin@seed.rasad.invalid`       | `/admin`     |
| Employee              | `09000000002`    | `employee@seed.rasad.invalid`    | `/admin`     |
| Follow-up specialist  | `09000000003`    | `followup@seed.rasad.invalid`    | `/admin`     |
| Inviter A             | `09000000004`    | `inviter-a@seed.rasad.invalid`   | `/invite`    |
| Inviter B             | `09000000005`    | `inviter-b@seed.rasad.invalid`   | `/invite`    |
| Teacher A — امیر دانا | `09000000006`    | `teacher-a@seed.rasad.invalid`   | `/teacher`   |
| Teacher B — نیما فرهی | `09000000007`    | `teacher-b@seed.rasad.invalid`   | `/teacher`   |
| Teacher C — پگاه روشن | `09000000008`    | `teacher-c@seed.rasad.invalid`   | `/teacher`   |
| Reception A           | `09000000009`    | `reception-a@seed.rasad.invalid` | `/reception` |
| Reception B           | `09000000010`    | `reception-b@seed.rasad.invalid` | `/reception` |

Passwords go through Payload's normal `create` authentication handling. No manual hashes or additional password fields are used. Reruns print the initial password but never reset a changed password.

## Fixtures and scenarios

| Collection                   |       Initial seed count |
| ---------------------------- | -----------------------: |
| Users                        |                       10 |
| Teachers                     | 4 (3 active, 1 inactive) |
| Classes                      |                        8 |
| Students                     |                       75 |
| Follow-ups                   |                       36 |
| Ceremonies                   |                        6 |
| Sessions                     |                       16 |
| Invitations                  |                       16 |
| Session check-ins            |                        8 |
| Invitation claims / SMS jobs |                        0 |

Titles begin with `نمونه رصد ·` and person surnames end with `نمونه‌رصد`. All names, phones and notes are fictional. Values/order are deterministic; dates are relative to the first execution day, scheduled at 17:30–19:30 Tehran time. Dates are stored as ISO instants. Later executions preserve these dates.

- **Teacher:** A owns multiple classes, B and C own different primary classes; assistant-teacher relationships also exist. Each teacher has referred, absorbed and stabilized Students. Other class statuses include planned, admissions paused, transition, suspended, ended and cancelled. Test absorption/removal and cross-teacher denial.
- **Students/Admin:** all six lifecycle statuses, both readiness statuses, grades 1–6, no-class Students, several phone combinations, sparse reception profiles and a mixture of zero/one/multiple follow-ups by different operators. Stabilization dates exceed six calendar months after absorption.
- **Invitation:** select **نمونه رصد · دیدار خانواده‌ها**. نوبت 1 is sealed, نوبت 2 filling, and two later Sessions queued. All four outcomes exist, with more than 30 unprocessed eligible Students. **سامان رضایی نمونه‌رصد** requested an alternative in the earlier Session and is eligible now; **کیان رضایی نمونه‌رصد** requested an alternative in the current Session and is eligible only after advancement. Two inviter accounts can claim concurrently. Advance from Admin while a claim is open to exercise stale submission rejection.
- **Future/history:** a scheduled future Ceremony, today's active Ceremony, completed Ceremony with historical invitations/check-ins, cancelled Ceremony and draft Ceremony are included. Each inviting/scheduled/active Ceremony has exactly one filling Session; all Session statuses are represented.
- **Reception:** in **دیدار خانواده‌ها**, search **علی رضایی** for two same-name Students. **علی رضایی** has an accepted first-Session invitation; one record already attended that Session and the other attended the second Session. **امیر رضایی نمونه‌رصد** is invited to نوبت 1 but has not attended: choosing نوبت 2 exercises the wrong-Session warning. **حسین رضایی نمونه‌رصد** is invited to نوبت 2 and has not attended. Existing check-ins support duplicate rejection. Three **حضوری نمونه‌رصد** Students have only required profile fields and walk-in origin; unrelated uninvited Students remain available for ordinary check-in.
- **SMS:** queued/sent/failed/not_required are historical **display fixtures**, not evidence of delivery. No jobs are queued and no provider is invoked. Historical snapshots use trusted Local API with collection hooks and explicit invariant validation inside one transaction. Live outcome services are deliberately not invoked because they enqueue SMS and own separate transactions. Real operator actions after seeding still use normal domain services; keep the development application on `SMS_PROVIDER=mock` as well.

## Verification

The seed validates initial counts, lifecycle dates, ownership, accepted-session relationships, uniqueness, status coverage and queue availability before commit. Focused integration tests also prove full rollback, repeated-run equality, preservation of unrelated/manual records, all ten logins, teacher denial/absorption, reception disambiguation/wrong-session/duplicate behavior, concurrent invitation claims and stale submission rejection.

```sh
TEST_DATABASE_URL=postgresql://postgres@localhost:5432/rasad_seed_test \
  pnpm --filter @rasad/cms exec vitest run --config vitest.config.mts tests/int/dev-seed.int.spec.ts
pnpm typecheck
pnpm lint
```

The integration test harness clears its disposable `_test` database. Use a separate test database from the seeded database you want to browse. Execution evidence is recorded in `.reports/dev-seed.md`.
