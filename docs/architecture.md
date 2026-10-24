# Architecture: foundation

The first release deliberately has two running services:

1. **Console**: Next.js + TypeScript. Renders drafts and exposes `/api/projects` and
   `/api/health`. It does not execute prompts or shell commands.
2. **Database**: PostgreSQL 17 with a named Docker volume. Owns project briefs and the
   migration history. No host port is published.

The console waits for database readiness and applies unapplied SQL migrations before
starting. The health endpoint checks the projects table, not just the HTTP process.
The application image uses a multi-stage build and runs as an unprivileged user.

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
`schema_migrations`: migration filename and application time.

The homepage and listing API show the most recent 50 projects. There is no edit/delete
workflow or pagination yet. New projects are not silently seeded on startup.
