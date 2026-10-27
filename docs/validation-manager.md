# Manager discovery validation — 2026-10-27

## Environment

- Source checks: macOS arm64, Node.js 24.14.0, committed npm lockfile.
- Runtime/migration checks: Linux amd64 Docker host, disposable
  `ghostshift-workflow-test` stack using `compose.yaml` plus `compose.test.yaml`.
- Inference: synthetic provider only, plus mocked adapter unit tests. No real OpenAI,
  compatible API or Ollama inference was requested by validation.

## Passed

- `npm ci` (separate temporary cache), `npm test` (11 tests), `npm run build`,
  `npm run typecheck`, and `git diff --check`.
- Fresh disposable Compose build/start and `npm run smoke`.
- `npm run test:manager`: confirmed memory, unconfirmed summary, bounded transcript
  context, model metadata/usage, concurrent-request rejection, cross-conversation isolation,
  invalid provider rejection, explicit paid-consent rejection before enqueueing, AI/human
  brief versions, stale approval rejection, exactly-once project handoff without planning,
  cancellation without late output, retry success, malformed output failure.
- Manager worker SIGKILL/expired-lease recovery: two attempts, one published response.
- `npm run test:workflow` with synthetic fixture and worker recovery enabled: original
  planning review/edit/approval/revision, concurrent queueing, retries, terminal failure,
  cancellation, usage and rendered project page.
- `npm run test:upgrade`: legacy schema adoption, drift/missing-CHECK rejection,
  all five migrations, preserved original project and restart persistence.
- Prisma diff from the disposable database to the current schema: empty migration.
  PostgreSQL CHECKs and the active-manager-job partial unique index are intentionally
  maintained in reviewed migration SQL.
- Full disposable `down` followed by `up --build -d --wait`: conversation ID, all displayed
  messages, confirmed memory, summary, brief versions and linked project ID unchanged.
  Final Manager list/detail pages returned HTTP 200 and rendered their expected content.

Manager recovery was tested with the initial implementation; the final worker retains the
same recovery code. The final runtime was rebuilt after context/UI refinements, with the
manager lifecycle repeated, original workflow checks and restart persistence verified.
The CI manager script also includes full restart persistence for future runs.

## Limits

- Visual/browser interaction checks were unavailable because the connected Mac was locked.
  Build, HTTP server rendering and workflow APIs were checked; responsive appearance and
  browser-only interactions still need a human visual check.
- Real model response quality and paid provider connectivity were not exercised.
- Development/sandbox integration suites were not repeated: executor and coding paths are
  unchanged, and their existing unit tests passed. The required planning workflow was run.
- This milestone implements text discovery and a project brief; repository ingestion,
  Grok and additional generated documents are not implemented.

## CI restart transport correction

The first CI run reached the manager restart persistence check but its Node HTTP client
reused a connection closed by the deliberately stopped console (`UND_ERR_SOCKET`). The
manager test now sends `Connection: close`, matching the existing configuration/workflow
test helpers. This is a test transport correction; application code is unchanged.
The complete corrected manager script passed on the disposable Linux stack with worker
SIGKILL recovery and full Compose down/up persistence enabled.

## Deployment verification

The owner authorized deployment. A private database/configuration backup was captured before
updating the permanent checkout. An initial build inherited an overly restrictive backup
umask, making public source files unreadable to the migrator's unprivileged user; no database
migration ran on that attempt. Normal source permissions were restored without loosening
backup/environment permissions, and the rebuild/migration completed successfully. Operations
documentation now scopes the backup umask to a subshell.

All six long-running services were healthy, existing project IDs matched the pre-deployment
snapshot, and the backup archive was readable. Health, Manager, Projects and Configuration
returned HTTP 200. The console remained bound to loopback and PostgreSQL had no published
ports. The existing WireGuard proxy target was preserved. No live model calls were made by
post-deployment verification.
