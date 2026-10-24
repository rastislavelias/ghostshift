# Backup and recovery

These commands are run from the repository directory on the Docker host. Store backups
outside the server too. A backup in the same disk does not survive a disk wipe.

## Backup

```sh
mkdir -p backups
docker compose exec -T database pg_dump -U ghostshift -d ghostshift -Fc > backups/ghostshift.dump
```

Check that the command succeeded and copy the dump to secure external storage.
`backups/` is excluded from Git and the Docker build context. Dumps may contain private briefs.

## Restore after reinstall

Install Docker and Git, clone this repository, restore your optional `.env`, and copy the dump
into `backups/ghostshift.dump`. Start **only the database** in an empty Compose workspace:

```sh
docker compose up -d --wait database
docker compose exec -T database pg_restore -U ghostshift -d ghostshift --no-owner --exit-on-error < backups/ghostshift.dump
docker compose up --build -d --wait
```

Restore into a fresh database; these commands intentionally do not clear an existing one.
If restore fails, do not repeatedly import over partial data. Investigate or create a new
disposable target. The app applies any later migrations after restore.

## Persistence and updates

The named PostgreSQL volume survives container rebuilds and `docker compose down`.
It does not automatically move with Git, survive a full disk reinstall, or protect against
`docker compose down -v`. Keep the Compose project name consistent when reusing a volume.

Updates: `git pull`, then `docker compose up --build -d --wait`.
Back up before schema upgrades. Database migrations are forward-only in this foundation;
restoring a backup is the recovery path for an incompatible schema change.

## Remote access and troubleshooting

The supported access method is a local browser or an SSH tunnel:

```sh
ssh -N -L 3000:127.0.0.1:3000 your-user@your-server
```

If local port 3000 is already occupied, use `-L 3001:127.0.0.1:3000` and browse port 3001.
Inspect `docker compose ps` and `docker compose logs --tail=100 console migrate database`.
If startup fails because the host port is occupied, set `GHOSTSHIFT_PORT` in `.env`.
If PostgreSQL credentials mismatch, check the credentials used when the volume was created.
Do not publish port 5432 or bind the console to all interfaces as a troubleshooting shortcut.

## Upgrade from the SQL migration release

Back up first, then run the usual update command. The migration task checks the legacy
history, table structure, and original CHECK constraints before recording a Prisma baseline.
It does not recreate tables or delete briefs. An unrecognized schema blocks startup; inspect
`docker compose logs migrate` and [database development](database.md) instead of resetting
the database. Keep the original Compose project name and volume.
