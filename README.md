# Ghostshift

**One human. A team of AI agents. From idea to deployment.**

Ghostshift is an open-source experiment in building a human-directed AI development studio.
This first release is a small, working foundation: a Next.js control console, PostgreSQL,
and a Docker Compose setup that starts both with one command.

**Current status: foundation, not an autonomous development team.** You can create and store
project briefs. Agent execution, model providers, GitHub automation, deployment automation,
and voice input are future work. No AI account or API key is needed to run this version.

## Start with Docker

Install Git and Docker Engine with the Compose v2 plugin (or Docker Desktop). The host needs
internet access for the initial image build. Node.js and PostgreSQL are provided by Docker.
Linux amd64 and Apple Silicon arm64 are supported by the chosen base images; check the
validation record below for architectures actually tested.

```sh
git clone https://github.com/rastislavelias/ghostshift.git
cd ghostshift
docker compose up --build -d --wait
```

Open **http://localhost:3000** and create your first project. Startup waits for PostgreSQL,
applies versioned SQL migrations, and starts the console. The first build takes longer;
later starts reuse cached layers. There are no automatic model downloads or paid AI calls.

The console binds to `127.0.0.1`, and PostgreSQL is not published to the host. This version
has **no login** and is intended for a single owner using a local machine or SSH tunnel.
Do not expose it directly to the internet. For a remote server:

```sh
ssh -N -L 3000:127.0.0.1:3000 your-user@your-server
```

Then open http://localhost:3000 on your own computer.

## What's included

| Component | Purpose |
| --- | --- |
| `apps/console` | Next.js App Router, TypeScript, project form and saved drafts |
| `db/migrations` | Versioned PostgreSQL schema, applied automatically at startup |
| `scripts` | Startup, database migration, and integration smoke check |
| `docs` | Architecture, recovery instructions, and the first development milestone |
| `services/orchestrator` | Documented boundary for a future worker service; no worker runs yet |
| `AGENTS.md` | Repository instructions for AI coding tools and contributors |
| `.github/workflows/ci.yml` | Type checks, unit tests, Docker build and integration checks |

## Configuration

No `.env` file is required for the local starter. To override settings, copy `.env.example`
to `.env` before first startup. The default database password is an explicitly public local
development value, not a production secret. Real secrets must stay outside Git.

- `GHOSTSHIFT_PORT`: localhost port, default `3000`.
- `POSTGRES_PASSWORD`: PostgreSQL password, default `ghostshift-local-only`.

Changing this password in `.env` after initialization does not change the password stored
inside PostgreSQL. Rotate the database role password separately if needed. Do not delete
the volume just to change a password if it contains data you need.

## Everyday commands

```sh
docker compose ps
docker compose logs -f console
docker compose down
docker compose up -d --wait
```

`down` preserves the database volume. **`docker compose down -v` deletes this stack's data.**

After pulling updates, run `docker compose up --build -d --wait` again. Applied migrations
are recorded and skipped on future starts. Migrations run in one transaction under a
database lock; a failed migration stops application startup rather than running an
incompatible schema.

## A reinstalled server

Cloning and running Compose recreates the application and an **empty** workspace.
Existing projects only return if you restore a backup or the original database volume.
Git does not contain your database. See [backup and recovery](docs/operations.md).

## Development and checks

For the complete environment, use Docker. For faster UI iteration, use Node.js 24 locally:

```sh
npm ci
npm test
npm run build
npm run typecheck
```

`npm run dev` also needs a running PostgreSQL instance, the standard `PGHOST`, `PGPORT`,
`PGDATABASE`, `PGUSER`, `PGPASSWORD` environment variables, and `npm run db:migrate` first.
The Compose database intentionally has no host port; use your own local development DB
if running the Next.js process outside Docker.

Against a running disposable stack:

```sh
npm run smoke
```

This creates one draft named `Smoke test` and checks health, rejected input, cross-origin
protection, project creation, listing, and rendering. Use a test workspace, not a client DB.

See [architecture](docs/architecture.md), [next milestone](docs/roadmap.md), and
[validation](docs/validation.md). Repo documentation is in English for contributors and
portfolio reviewers.

## AI-assisted development

This project is developed with AI coding assistance and human direction. The owner sets
scope and reviews decisions; automated checks verify specific behavior. Generated code
is treated as a contribution to review, not proof of correctness. Current limitations and
future capabilities are described explicitly rather than presented as completed features.

## License

MIT. You may use, modify, and redistribute the project under the terms in [LICENSE](LICENSE).
