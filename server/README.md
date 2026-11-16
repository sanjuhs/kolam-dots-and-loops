# Kolam accounts and scores

**Production data preservation:** read [AGENTS.md](../AGENTS.md) before database, deployment, or cleanup work. This is a dedicated production database with persistent user data; routine work must preserve its database file, volume, and auth secret.

Self-hosted Node 22 / Express / Better Auth with a separate SQLite database. No account service subscription. The frontend stays on Vercel and forwards `/api/*` to the dedicated Coolify app. Browser sessions use secure HttpOnly, SameSite=Lax cookies on the frontend domain. No password or session token is placed in localStorage.

## Development

From the project root:

```sh
npm ci --prefix server
node server/dev.mjs
```

Open http://127.0.0.1:8772. The development database is in memory and resets when the process stops. Production uses `/data/kolam.sqlite` in a dedicated Docker volume. Never expose the `server` directory as static web content in production; `.vercelignore` excludes it.

```sh
npm test --prefix server
node --test tests/*.test.cjs
BASE_URL=http://127.0.0.1:8772 node tests/community-browser.cjs
```

Browser checks require Playwright separately. `CHROME_PATH` can select installed Chrome. They create a disposable test account, exercise sign-up, login, recovery, scoring and progress, then delete only that test account.

## Production

- Coolify project: `kolam-dots-and-loops`, UUID `gc44wo8oc0kk0wgw4owow0k8`
- Application: `kolam-api`, UUID `logso8gs88gcgscoow08ssgk`
- API: https://kolam-api.coolify.sanjayprasadhs.com/api/health
- Web: https://rangoli-design-game.vercel.app
- Build: root `Dockerfile` through the Coolify application. `docker-compose.yaml` is an optional standalone deployment recipe.
- Dedicated Coolify-managed volume: `logso8gs88gcgscoow08ssgk-kolam-data`, mounted at `/data`
- Database file: `/data/kolam.sqlite`; a new SQLite database dedicated to Kolam, with Better Auth tables and separate recovery, progress, attempts, scores, and daily-score tables. Existing projects' databases were not reused.
- Runtime variables: `.env.example` lists names; production secrets live only in Coolify.
- Better Auth migrations are applied at startup; game tables are additive, with foreign keys and WAL mode.
- One-hour backup checks create one consistent SQLite backup per India-calendar day and retain seven files in `/data/backups`. These are local backups on the same VPS, not protection against losing the VPS. Restore while the app is stopped by replacing `kolam.sqlite` with a selected backup and removing its old WAL/SHM files. Keep `BETTER_AUTH_SECRET` stable across releases.

The backups are inside the **same Docker volume** as the database. Deleting that volume also deletes the backups. Independent off-volume/off-site protection has not been configured. Preserve the volume during all ordinary deploys and cleanup; the full restrictions and restore safeguards are in `AGENTS.md`.

## Account recovery

Username is required; email is optional and may also be used to sign in. Every registration creates a 128-bit recovery code, shown once with copy/download controls. Only its SHA-256 hash is stored. Using it changes the password, invalidates existing sessions and replaces the code. Passwords are handled by Better Auth, with a 12-character minimum, no composition rules, and a 128-character maximum. Account deletion and issuing a replacement recovery code require the current password.

Email reset delivery is enabled only when both `SMTP_URL` and `MAIL_FROM` are configured. No mail sender was assumed or paid for. The UI exposes email recovery only when the API reports it ready. Never install an unauthenticated relay or claim delivery works without testing an actual sender. Username-only accounts always use their recovery code.

## Leaderboard rules

The API reconstructs the same deterministic puzzle, verifies the move replay, computes difficulty points and measures elapsed wall time on the server. A hint costs 10% of base points, with a 25% minimum; only no-hint solves qualify for fastest times. Replays improve a player's best points/time for a puzzle instead of farming extra all-time points. Today's board uses Asia/Kolkata. Boards expose usernames, points and times; emails stay private.

Legacy/guest progress imports do not award leaderboard points. Offline practice is saved locally and queued for progress sync, but cannot generate a timed leaderboard result without an online attempt. Ranked numbered levels are bounded at 100,000. Move histories are capped at 8,192; beyond that play continues as practice. Server verification stops casual score/time tampering, not automated solvers; this is a friendly leaderboard, not a cheat-proof competition.

API limits include origin checks on state changes, Better Auth database-backed limits, additional account/IP rate limits, four concurrent password operations, request size limits, bounded attempts and leaderboard responses. The container is non-root and limited to one CPU / 512 MiB. The API returns `Cache-Control: no-store`; the service worker caches only its fixed app files.
