# Architecture: foundation

The workspace has a console, database, planning/development workers, isolated executor and dedicated Ollama, plus startup tasks:

1. **Console**: Next.js + TypeScript, with Tailwind CSS 4 and shadcn/ui. Renders drafts and exposes `/api/projects` and
   `/api/health`. Database access uses Prisma Client with the PostgreSQL driver adapter.
   It does not execute prompts or shell commands.
2. **Database**: PostgreSQL 17 with a named Docker volume. Owns project briefs and the
   migration history. No host port is published.

3. **Worker**: claims persisted planning jobs, calls the chosen provider, validates results,
   and publishes a new plan awaiting human review. No coding or deployment tools.
4. **Ollama**: separate local inference service and model volume; no published port.
5. **Model init**: downloads the configured local model once, then exits.
6. **Migrate**: a one-shot container that validates/adopts the legacy schema when needed
   and runs `prisma migrate deploy`. The CLI stays out of the console runtime image.

The console waits for database readiness and successful completion of the migration task. The health endpoint checks the projects table, not just the HTTP process.
The application image uses a multi-stage build and runs as an unprivileged user.
The Node 24 base image is pinned to a multi-platform index digest. Dependency versions are
resolved by `package-lock.json`; update the base digest deliberately when adopting security
updates. PostgreSQL follows the maintained `17-alpine` tag within the same major version.

## Planning and approval

The current flow is brief → persisted planning job → plan version → owner review/edits →
explicit approval. The worker never approves its own output. PostgreSQL tracks revision
numbers, jobs, attempts, plans, and events. See [workflow](workflow.md) for limits and leases.

Development flow: approved plan → explicit task → persisted developer job → LangGraph
developer/check/repair loop → isolated executor → patch and evidence → human decision.
See [development](development.md) for the supported playground and isolation limits.

## Deployment boundaries

- This starter is a single-owner local tool. It has no authentication or tenant isolation.
- Saving a brief inserts a draft. Planning starts only on an explicit request.
- Application API handlers are short-lived; coding tasks run in a separate developer worker.
- No GitHub token, Docker socket, or shell execution is available to the planner.
- Optional NVIDIA GPU access belongs only to Ollama; console and worker have no GPU devices.
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

Plans, jobs, attempts and project events are persisted in their own related tables.
Approval references a specific plan; the application only accepts the latest plan version.

The shared shadcn/ui shell separates Dashboard, Projects and Configuration. Provider keys
are encrypted in PostgreSQL, with a separate private master-key volume available only to
the console and trusted workers. See [configuration](configuration.md).

## Manager discovery

Manager adds persisted conversations, owner-maintained memory, AI summaries and versioned
briefs before the existing project lifecycle. The planner worker processes its bounded jobs
with cancellation, leases and revision fencing. Owner approval creates a draft project without
starting inference or development. See [manager discovery](manager.md).
