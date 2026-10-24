# Ghostshift

**One human. A team of AI agents. From idea to deployment.**

Ghostshift is an open-source experiment in building a human-directed AI development studio.
Ghostshift turns a brief into a reviewable AI project plan with a Next.js control console,
PostgreSQL, Prisma ORM, persisted workers, and its own Ollama instance.

**Current status: planning, approval and one bounded development task.** Create a brief, select a model,
review/edit/version the plan, request changes, and approve a specific version. The developer can prepare a playground patch with real checks and human review.
GitHub write automation, deployment automation, and voice input are future work. No paid API key
is needed for the bundled local planner.

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
runs Prisma migrations, and starts the console, workers and isolated executor. On first startup, a dedicated
Ollama service downloads `qwen3:4b` into its own persistent model volume. Allow time and disk
space for the image and model download. Later starts reuse the model and cached layers.
No inference is requested until you ask for a project plan; external paid APIs are opt-in.

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
| `apps/console` | Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, project form and saved drafts |
| `prisma` | Typed database schema and Prisma migrations, applied automatically at startup |
| `db/migrations` | Immutable legacy SQL, retained for upgrade verification |
| `scripts` | Startup, database migration, smoke and workflow integration checks |
| `docs` | Architecture, recovery instructions, and the first development milestone |
| `services/orchestrator` | Planning/development workers, LangGraph, provider adapters, leases and bounded retries |
| `services/executor` | Fixed-command, network-denied Next.js execution sandbox |
| `AGENTS.md` | Repository instructions for AI coding tools and contributors |
| `.github/workflows/ci.yml` | Type checks, unit tests, Docker build and integration checks |

See [development workflow and sandbox boundaries](docs/development.md) to configure a public playground and run a task after plan approval.

## Configuration

No `.env` file is required for the local starter. To override settings, copy `.env.example`
to `.env` before first startup. The default database password is an explicitly public local
development value, not a production secret. Real secrets must stay outside Git.

- `GHOSTSHIFT_PORT`: localhost port, default `3000`.
- `POSTGRES_PASSWORD`: PostgreSQL password, default `ghostshift-local-only`.
- `OLLAMA_MODEL`: local model initialized at startup, default `qwen3:4b`.
- `OLLAMA_MODELS`, `OPENAI_MODELS`, `COMPATIBLE_MODELS`: model allowlists; see [workflow](docs/workflow.md).
- Optional API keys and limits: see `.env.example`. Keys stay outside Git and the browser.

CPU mode is the default. Linux/NVIDIA users can set
`COMPOSE_FILE=compose.yaml:compose.gpu.yaml` in `.env` after installing NVIDIA Container
Toolkit. The same startup command then enables GPU access only for Ghostshift’s Ollama.

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

`down` preserves the database volume. **`docker compose down -v` deletes this stack's database and model data.**

After pulling updates, run `docker compose up --build -d --wait` again. Applied migrations
are recorded and skipped on future starts. Migration startup is serialized with a
database lock; a failed migration blocks console startup. Each migration must explicitly
include a transaction when its operations require one. See [database development](docs/database.md).

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
`PGDATABASE`, `PGUSER`, `PGPASSWORD` environment variables (or `DATABASE_URL`), and
`npm run db:migrate` first. Export these variables into the shell; local commands do not
automatically load `.env`. The Prisma client is generated by `dev` and `build`.
The Compose database intentionally has no host port; use your own local development DB
if running the Next.js process outside Docker.

Against a running disposable stack:

```sh
npm run smoke
```

This creates one draft named `Smoke test` and checks health, rejected input, cross-origin
protection, project creation, listing, and rendering. Use a test workspace, not a client DB.

See [planning and approval](docs/workflow.md), [architecture](docs/architecture.md), [UI conventions](docs/ui.md), [next milestone](docs/roadmap.md), and
[validation](docs/validation.md). Repo documentation is in English for contributors and
portfolio reviewers.

## AI-assisted development

This project is developed with AI coding assistance and human direction. The owner sets
scope and reviews decisions; automated checks verify specific behavior. Generated code
is treated as a contribution to review, not proof of correctness. Current limitations and
future capabilities are described explicitly rather than presented as completed features.

## License

MIT. You may use, modify, and redistribute the project under the terms in [LICENSE](LICENSE).
