# Planning worker

This service processes persisted project-planning jobs independently of HTTP requests.
It uses Prisma/PostgreSQL for claims, leases, bounded retries, cancellation and result
publication. Models have no shell, repository, network tools, or deployment permissions.
The provider HTTP endpoint is the only inference integration. See [workflow](../../docs/workflow.md).

The TypeScript build emits a Node.js 24 worker runtime. Compose builds the `worker` image,
which installs runtime dependencies separately from Next.js standalone tracing. No jobs
are seeded and no AI request is made merely by starting the worker.

The same worker processes persisted manager discovery requests when no planning job is ready.
Manager has its own conversation row locks, lease fencing, bounded retries and cancellation;
it can publish text and brief drafts but cannot approve or start development. See
[manager discovery](../../docs/manager.md) for context and memory boundaries.
