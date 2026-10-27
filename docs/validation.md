# Validation record

Checked on 2026-10-24 for the initial foundation release.

| Check | Result |
| --- | --- |
| npm lockfile installation | Passed; audit reported zero known vulnerabilities at check time |
| Input validation tests | 2 tests passed |
| TypeScript check | Passed |
| Next.js production build on macOS arm64 | Passed |
| Docker image build on Linux amd64 | Passed with BuildKit and the final pinned base image |
| Standard `docker compose up --build -d --wait` | Passed on Linux amd64 |
| Compose startup, migrations and service health | Passed on Linux amd64 |
| HTTP/API integration smoke checks | Passed: health, invalid input, cross-origin rejection, save, list, rendered draft |
| Browser form submission | Passed in Safari; confirmation shown and saved draft listed |
| Persistence after container removal/recreation | Passed; the same saved UUID remained |
| Backup and restore into a new database volume | Passed; the same saved UUID was restored |
| Repeat startup/migration | Passed; one applied migration remained after restore and restart |

The runtime tests used an isolated Compose project and disposable synthetic data, not an
existing application database. A test transport initially included macOS metadata sidecar
files; migration discovery was tightened to numbered SQL filenames and the clean transport
was retested successfully.

## Limits of this validation

An initial BuildKit run stalled while resolving a mutable Docker Hub tag. Pinning the Node
base to its multi-platform image-index digest resolved the issue. The final Dockerfile was
then built and started with standard Compose and BuildKit, and the HTTP smoke checks passed
again. The image index was checked to include both linux/amd64 and linux/arm64/v8.

The arm64 application build was checked on macOS, but the arm64 Docker image has not been
run. Authentication, public deployment, GPU inference and agent execution are not implemented
or tested. The included CI workflow reports its live result in GitHub Actions; consult that
result for the current commit rather than treating this dated record as a permanent guarantee.

## Tailwind CSS and shadcn/ui migration — 2026-10-24

- Existing input tests, TypeScript check, and macOS production build passed.
- A clean Linux amd64 Docker build and standard Compose startup passed in an isolated
  test stack. The existing HTTP/API smoke checks passed against that stack.
- Served HTML contained all six shadcn component markers, labeled regions, and the dark
  theme. The production stylesheet contained the semantic colors and responsive grid.
- Safari desktop and a 390 × 844 responsive viewport were visually checked, including
  the form, project list, validation error, and footer.
- Keyboard navigation through the form and submission with Return saved a synthetic
  project, displayed confirmation, and refreshed the project list. A whitespace-only
  name displayed the server validation error.
- The shadcn CLI `info` command recognized Next.js, Tailwind v4, the component aliases,
  and the six installed components.

These checks are not a full accessibility audit. Database migrations and API behavior
were unchanged. Runtime checks used disposable synthetic data; this was not a permanent
server deployment.

## Prisma migration — 2026-10-24

- Clean lockfile installation reported zero known vulnerabilities. Existing unit tests,
  Prisma client generation, Next.js production build, and TypeScript check passed on macOS arm64.
- Linux amd64 Docker builds and standard Compose startup passed with the one-shot Prisma
  migration service and standalone console runtime. Fresh startup applied the baseline.
- HTTP/API smoke checks passed for health, validation, cross-origin rejection, creation,
  listing, and rendering through Prisma Client.
- The upgrade integration test rejected a missing CHECK constraint and an unexpected column
  before baseline adoption. After restoring the original schema, it preserved a synthetic
  project's UUID, name, brief, status, and timestamp through the API and a container restart.
  Legacy history, one applied Prisma baseline, and three validated CHECK constraints remained.
- A PostgreSQL custom-format backup was restored into a new disposable volume. Startup
  succeeded and the original smoke project's UUID was still returned through the API.

Tests used isolated Compose projects with synthetic data on Linux amd64. No existing user
database was upgraded and no permanent deployment was created. The arm64 Docker image was
not run. UI styling was unchanged; no new visual or full accessibility audit was performed.
The CI workflow also runs the legacy upgrade checks for subsequent commits.

## Project planning and approval — 2026-10-24

- Unit checks passed for complete/bounded plan documents, configured-model allowlists,
  structured provider requests, token normalization, incomplete responses, and sanitized errors.
- Production build and TypeScript checks passed for the console and separately compiled worker.
- Linux amd64 Docker checks passed with a synthetic inference fixture: concurrent queueing,
  owner edits and versioning, rejection of stale approvals, approval/revocation, feedback,
  revised plans, bounded retry/failure, cancellation, usage reporting, and rendered detail.
- An interrupted worker was killed in the disposable stack, its lease expired, and a second
  attempt produced exactly one plan. The first attempt remained recorded as interrupted.
- Legacy SQL upgrade, drift rejection, original project preservation, and restart checks passed.
- Safari interactions checked brief creation/navigation, queued status, automatic plan refresh,
  owner editing into a new version, and explicit approval of that version.

Integration data was synthetic and isolated. The fixture is not a model-quality evaluation.
Paid OpenAI/compatible API calls were not made; those adapters were checked with mocked
transport only. No full accessibility or mobile visual audit was performed for this release.

## Bounded development workflow — 2026-10-24

Executed on a disposable Linux/amd64 Docker stack, with a synthetic model provider and real
Next.js execution (no paid AI calls):

- `npm ci`, seven unit/provider/graph tests, production build and both TypeScript projects.
- Smoke checks and the existing planning lifecycle regression.
- Development approval gating and duplicate/stale submission rejection; a deliberately broken
  TypeScript page repaired on the second model attempt; actual typecheck, page render tests and
  production build; downloadable patch and pinned Git base; owner revision and acceptance;
  terminal attempt exhaustion; cancellation during a provider call; approval revocation.
- Developer process killed during a reserved attempt, lease expired in the disposable DB,
  restarted worker: old attempt marked interrupted, second/final attempt returned a reviewable
  result. No unbounded retry or automatic approval.
- Executor API authentication and protected dependency manifest; generated code checked that
  DB/provider/control secrets were absent, supervisor process environment was unreadable, child
  Linux capabilities were zero, dependency filesystem was read-only, and new loopback/external
  network connections were denied. These probes also passed a real production build.
- Legacy schema drift rejection, three-migration upgrade, original row preservation, PostgreSQL
  CHECK constraints and persistence across stack restart.

The sandbox process cap uses a per-container pids cgroup. A per-UID RLIMIT_NPROC was removed
because Linux counts the same host UID across containers, causing unrelated stacks to consume
that shared limit. Next.js development type paths are included in the trusted template so it
no longer rewrites tsconfig during the sandbox build. Initial failing checks were rerun after
these fixes. Container isolation is not a security certification or hostile-tenant boundary.

Final sandbox checks additionally planted a temporary file before a request and wrote another
from generated code. The next request could not see the previous file, and no generated
scratch file remained after completion. The full development lifecycle was rerun successfully
with cleanup enabled, including recovery and a result superseded by a newly approved plan.

## Dashboard navigation and OpenAI configuration — 2026-10-27

Executed with Node.js 24 on macOS/arm64 and a disposable Linux/amd64 Docker stack:

- `npm ci`, nine unit/provider/graph/credential tests, production build and both TypeScript checks.
- Fresh Compose startup without API credentials; Dashboard/Projects/Configuration server rendering,
  project creation/list/detail smoke checks and the existing planning review/retry/cancellation flow.
- New settings API: invalid/cross-origin inputs rejected, authenticated AES-GCM ciphertext stored
  instead of plaintext, API/HTML never returned the synthetic key, stored configuration exposed
  the OpenAI model, and missing paid consent prevented job creation without contacting OpenAI.
- Trusted worker read/decrypted the synthetic configured key, observed replacement/removal without
  restart, and still read it after a full Compose down/up. Master-key permissions were 0600 and
  the execution sandbox had no master-key mount. Test keys were removed after verification.
- Development integration: actual typecheck/render/build, bounded repair, patch review/revision,
  acceptance, exhaustion, cancellation, revoked approval and obsolete-result handling.
- Legacy schema drift rejection, four-migration upgrade, original record and CHECK preservation,
  and persistence after restart. The configuration test also restarts its own disposable stack.

No OpenAI API request or charge was made. Actual key validity, account model access and real
OpenAI inference remain untested. Browser visual/mobile interaction checks were unavailable:
CUA reported that the Mac was locked, with no available browser surface. No unlock was requested
because the owner is away from the Mac. Mobile navigation uses the official shadcn/ui Sheet;
responsive rendering and keyboard behavior still need an unlocked-browser visual check.
