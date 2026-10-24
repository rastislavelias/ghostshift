# Database development

Ghostshift uses **Prisma ORM 7.10.1**, the generated TypeScript Prisma Client, and
`@prisma/adapter-pg`. PostgreSQL remains the persistent database. The application uses
Prisma for project creation, listing, and readiness checks; `pg` remains the underlying
driver and is used by the startup migration guard.

## Files and commands

- `prisma/schema.prisma`: current application models mapped to the existing SQL names.
- `prisma/migrations`: committed SQL migrations managed by Prisma Migrate.
- `prisma/baseline.prisma`: immutable description of the original SQL release, used only
  to verify legacy adoption. Do not update it when adding new application models.
- `db/migrations/001_projects.sql`: immutable legacy fixture; not executed on new starts.
- `scripts/migrate.mjs`: guarded legacy adoption followed by `prisma migrate deploy`.

```sh
npm run db:generate
npm run db:migrate
npm run db:status
```

Local database commands require exported `DATABASE_URL` or standard PostgreSQL `PG*`
variables. They do not automatically read `.env`. Compose supplies the `PG*` variables to
both the console and migration task. Connection URLs are constructed with encoded credentials.
`dev` and `build` generate the client; generated code is excluded from Git and regenerated
inside the Docker build. Build and generation do not need a running database.

To develop a schema change, use a dedicated development PostgreSQL database, edit
`schema.prisma`, then run:

```sh
npx prisma migrate dev --name describe_change --create-only
# Review the generated SQL before applying it.
npx prisma migrate dev
npm run db:generate
```

Never run `migrate dev`, `migrate reset`, or `db push` against an existing user database.
Commit the schema, migration, and lockfile changes together. Prisma does not represent
PostgreSQL CHECK constraints in its schema language: preserve the existing name, brief,
and draft-status constraints in SQL. Include explicit transactions in migration SQL when
atomic application is required. Do not change an already released migration.

## Docker startup and existing installations

The one-command Compose startup is unchanged. The `migrate` service uses the CLI image,
waits for PostgreSQL health, and exits after applying migrations. The standalone console
image contains the runtime client, without the migration CLI, and depends on successful
migration completion. Both services run as unprivileged users.

A new database receives the baseline migration. A database from the original SQL release
is adopted only when its recorded history is exactly `001_projects.sql`, its structure
matches the immutable baseline, and all three original validated CHECK constraints match.
The baseline is then recorded with `prisma migrate resolve --applied`; tables and project
data are not recreated. The legacy history table is retained. Unknown history or schema
drift blocks startup and needs investigation; never reset a database to bypass this guard.
Later starts run `migrate deploy`, using `_prisma_migrations` as the migration history.

Take a backup before upgrading; see [operations](operations.md). Automatic legacy adoption
is limited to the original PostgreSQL 17 schema, not arbitrary user-modified databases.
The initial CHECK definitions are compared exactly as PostgreSQL 17 reports them.

## Verification

`npm run test:upgrade` requires a Docker daemon. It creates only the disposable
`ghostshift-upgrade-test` Compose project, refuses an existing test volume or container,
and removes its synthetic data afterwards. It checks missing constraints, structural drift,
legacy project preservation through the API, migration history, and restart persistence.
Use `UPGRADE_TEST_PORT` to choose another localhost port (default `3001`). CI also tests
fresh startup, API behavior, persistence, and backup/restore.

References: [Prisma 7 client generation](https://www.prisma.io/docs/orm/v7/prisma-schema/overview/generators),
[Prisma Migrate deployment](https://docs.prisma.io/docs/cli/v7/migrate/deploy), and
[Prisma 7 Docker integration](https://www.prisma.io/docs/guides/v7/deployment/docker).
