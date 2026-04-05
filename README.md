# Sunday Church Masters Competition

A DraftKings-style fantasy golf app for the 2026 Masters Tournament. Users pick 6 golfers under a $50,000 salary cap and compete on a live-updating leaderboard.

## Quick Start (Local)

### 1. Prerequisites

- Node.js 20+ (via nvm: `nvm use 20`)
- PostgreSQL running locally

### 2. Clone & install

```bash
cd "Masters Group Game"
npm install
```

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local — set DATABASE_URL to your local Postgres
```

### 4. Set up database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to DB (dev only — creates tables)
npm run db:push

# Seed with player pool
npm run db:seed
```

### 5. (Optional) Import from your spreadsheet

If you have the actual 2026 Masters salary spreadsheet:

```bash
npm run import:salaries path/to/2026_masters_salary_list.xlsx
```

Expected columns: `Name` (or Player/Golfer) and `Salary` (or Sal/Amount). Case-insensitive.

### 6. Run the app

```bash
npm run dev
# Open http://localhost:3000
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/play` | Lineup builder — pick 6 players, submit |
| `/leaderboard` | Public scoreboard |
| `/admin` | Admin panel — manual sync, entry review |

## Environment Variables

See `.env.example` for all variables.

Key ones:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `MASTERS_STATS_PROVIDER` | `mock` (default) or your provider key |
| `SYNC_ENABLED` | `true`/`false` |
| `SYNC_START_HOUR_ET` | Active sync window start (ET), default `6` |
| `SYNC_END_HOUR_ET` | Active sync window end (ET), default `21` |
| `ADMIN_SECRET` | Shared secret for `/admin` page |

## Deployment (Netlify)

See [docs/netlify-deploy.md](docs/netlify-deploy.md) for full instructions.

Quick version:
1. Connect repo to Netlify
2. Set all env vars in Netlify dashboard
3. Install `@netlify/plugin-nextjs` (already in `netlify.toml`)
4. Deploy — scheduled sync function activates automatically

## Stat Syncing

Stats refresh every 15 minutes via `netlify/functions/sync-stats.mts`.
The function checks `SYNC_START_HOUR_ET`/`SYNC_END_HOUR_ET` before syncing.

To plug in a real stats source, implement `StatsProvider` in `lib/stats/provider.ts`.

## Project Structure

```
app/                  Next.js App Router pages & API routes
  api/
    players/          GET player pool
    entries/          POST submit lineup
    leaderboard/      GET scored leaderboard
    admin/            POST sync, GET entries/runs (secret-protected)
  play/               Lineup builder page
  leaderboard/        Public scoreboard
  admin/              Admin panel
components/           UI components
lib/
  prisma.ts           Prisma client singleton
  constants.ts        SALARY_CAP, ROSTER_SIZE, etc.
  validation.ts       Zod schemas + salary cap check
  scoring/            Scoring engine + config
  stats/              Stats provider abstraction + sync service
  timezone.ts         ET window helpers
netlify/functions/    Scheduled sync function
prisma/
  schema.prisma       Database models
  seed.ts             Player pool seed script
scripts/
  import-salaries.ts  Spreadsheet import script
docs/                 Architecture, handoff, Netlify docs
```
