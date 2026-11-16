# Kolam agent instructions

Read the parent `WORKSPACE_RULES.md` and [server/README.md](server/README.md) before deployment, database, backup, or infrastructure work.

## Production data must survive routine work

This application has real persistent account, progress, and leaderboard data. It is not a disposable demo database.

- Database: a dedicated **SQLite** database, `/data/kolam.sqlite` inside the backend container. SQLite WAL/SHM sidecar files may accompany it.
- Persistent Docker volume: **`logso8gs88gcgscoow08ssgk-kolam-data`**, mounted at `/data`.
- Coolify project: `kolam-dots-and-loops` (`gc44wo8oc0kk0wgw4owow0k8`).
- Coolify application: `kolam-api` (`logso8gs88gcgscoow08ssgk`).
- Accounts and game tables belong to this new database. Do not reuse, reset, migrate, or delete another application's database or volume.

Deployments, restarts, testing, cleanup, dependency fixes, and infrastructure repairs **do not authorize deleting production data**. Never delete or recreate this volume, erase the SQLite database/sidecars, use `docker compose down -v`, run volume-pruning commands, truncate production tables, or substitute a fresh empty database during routine work. Destructive database/volume operations require the user's explicit instruction identifying the production data affected and a verified independent backup first.

Before deploying, verify that the intended backend still mounts the same persistent volume at `/data`, keeps `DATABASE_PATH=/data/kolam.sqlite`, and preserves `BETTER_AUTH_SECRET`. Do not silently generate a replacement production auth secret. Keep migrations additive and compatible with stored data. A container replacement has already been tested to preserve account sessions and progress.

Development uses an in-memory database via `server/dev.mjs`; backend tests also use isolated in-memory databases. Never point unit tests, fixtures, seed/reset scripts, or load tests at the production SQLite file. Live verification may create a clearly identified disposable test account and delete only that account with its own credentials; never bulk-delete by username prefix.

## Backup limits

The app creates daily consistent SQLite backups and retains seven files in `/data/backups`. Automatic retention of these application-managed daily backups is expected. **These backups share the production volume**: deleting the volume destroys both the live database and these backups. No off-volume or off-site backup is currently configured. Do not describe the current backup arrangement as protection against volume deletion, disk failure, or loss of the VPS.

Do not restore or overwrite a live database without explicit user direction. Stop the backend before a restore, follow the restore notes in `server/README.md`, preserve a separate copy of the current data, and verify the result before resuming service. Do not copy production databases, backups, credentials, or account data into Git, frontend assets, screenshots, or public test reports.
