# Architecture: foundation

The foundation has two long-running services and one startup migration task:

1. **Console**: Next.js + TypeScript, with Tailwind CSS 4 and shadcn/ui. Renders drafts and exposes `/api/projects` and
   `/api/health`. Database access uses Prisma Client with the PostgreSQL driver adapter.
   It does not execute prompts or shell commands.
2. **Database**: PostgreSQL 17 with a named Docker volume. Owns project briefs and the
   migration history. No host port is published.

3. **Migrate**: a one-shot container that validates/adopts the legacy schema when needed
   and runs `prisma migrate deploy`. The CLI stays out of the console runtime image.

The console waits for database readiness and successful completion of the migration task. The health endpoint checks the projects table, not just the HTTP process.
The application image uses a multi-stage build and runs as an unprivileged user.
The Node 24 base image is pinned to a multi-platform index digest. Dependency versions are
resolved by `package-lock.json`; update the base digest deliberately when adopting security
updates. PostgreSQL follows the maintained `17-alpine` tag within the same major version.

## Why no orchestrator process yet?

There is no real job execution to coordinate. A service that only prints a heartbeat would
hide that gap and complicate installation. `services/orchestrator` reserves the boundary
and documents the next step without claiming that agents are working.

Future flow: console → persisted job → isolated worker → reviewable result → human decision.
The database remains the source of truth, independent of model conversations.

## Deployment boundaries

- This starter is a single-owner local tool. It has no authentication or tenant isolation.
- Agent execution is not connected. Saving a brief only inserts a draft.
- Application API handlers are short-lived; future coding tasks run in separate workers.
- No provider SDK, GitHub token, Docker socket, GPU access, or model service is included.
- Client code and deliverables will live in separate repositories/workspaces.
- Public demo deployments need authentication, TLS, access controls, and deployment-specific
  configuration before use. Loopback + SSH access is the supported starter configuration.

## Data model

`projects`: UUID, name, brief, draft status, creation time.
`_prisma_migrations`: Prisma migration history.
`schema_migrations`: retained legacy history, no longer used to apply new migrations.

The Prisma model maps to the original table and column names. Database defaults, UUIDs,
timestamps, and CHECK constraints remain intact. See [database workflow](database.md).

The homepage and listing API show the most recent 50 projects. There is no edit/delete
workflow or pagination yet. New projects are not silently seeded on startup.
