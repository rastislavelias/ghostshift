# Validation record

Checked on 2026-10-24 for the initial foundation release.

| Check | Result |
| --- | --- |
| npm lockfile installation | Passed; audit reported zero known vulnerabilities at check time |
| Input validation tests | 2 tests passed |
| TypeScript check | Passed |
| Next.js production build on macOS arm64 | Passed |
| Docker image build on Linux amd64 | Passed using the legacy builder; see limitation below |
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

The server's BuildKit path stalled while resolving Docker Hub image metadata. The same
Dockerfile built successfully with `DOCKER_BUILDKIT=0 docker build`; the resulting image
passed the runtime and recovery checks. This is recorded rather than claiming a successful
BuildKit build on that host. GitHub Actions separately runs the standard Compose build.

The arm64 application build was checked on macOS, but the arm64 Docker image has not been
run. Authentication, public deployment, GPU inference and agent execution are not implemented
or tested. The included CI workflow reports its live result in GitHub Actions; consult that
result for the current commit rather than treating this dated record as a permanent guarantee.
