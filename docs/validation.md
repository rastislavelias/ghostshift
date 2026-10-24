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
