# Architecture — Sunday Church Masters Competition

## Overview

Next.js App Router app deployed on Netlify. PostgreSQL database via Prisma.
Stats sync runs as a Netlify Scheduled Function every 15 minutes within configured ET hours.

## Data Flow

```
User (browser)
  → /play page (client component)
  → POST /api/entries  →  Prisma → PostgreSQL
  → GET /leaderboard   ←  scored from PlayerStat records

Netlify Scheduled Function (every 15 min)
  → sync-stats.mts
  → lib/stats/sync.ts::runStatSync()
  → StatsProvider::getLivePlayerStats()
  → upsert PlayerStat records
  → computeAllEntryScores()  →  update Entry.score
```

## Key Design Decisions

### Stats provider abstraction
All stat fetching goes through `StatsProvider` (lib/stats/provider.ts).
Swap the implementation by changing `MASTERS_STATS_PROVIDER` env var.
Currently uses `MockStatsProvider` — returns empty data so the app works
end-to-end before a real stats source is wired in.

### Scoring is decoupled from the UI
The scoring engine (`lib/scoring/engine.ts`) reads `PlayerStat` records and
applies `lib/scoring/config.ts`. Entry scores are stored on the `Entry` model
so the leaderboard is just a DB read — no live computation at page load time.

### Sync always logs
Every sync attempt creates a `SyncRun` record — success, failure, or skip.
This makes it easy to debug and inspect in the admin panel.

### Salary cap is enforced server-side
`POST /api/entries` re-fetches player salaries from the DB and validates
the cap before creating the entry. Client-side enforcement is UX only.

## Database Models

| Model | Purpose |
|---|---|
| `Player` | Player pool — name, salary, isActive |
| `Entry` | A submitted lineup — userName, totalSalary, score |
| `EntryPlayer` | Join table — Entry ↔ Player (6 rows per entry) |
| `PlayerStat` | Live tournament stats per player per event |
| `SyncRun` | Log of every stat sync attempt |

## Netlify Architecture

- **Site**: Next.js via `@netlify/plugin-nextjs`
- **Scheduled function**: `netlify/functions/sync-stats.mts` — cron every 15 min
- **Time window guard**: `lib/timezone.ts::isWithinSyncWindow()` — exits early outside ET hours
- **Manual sync**: POST `/api/admin/sync` (requires `x-admin-secret` header)

## Scoring

Currently placeholder: `Entry.score = sum of Player.totalToPar` for each player in the lineup.
Lower = better (golf scoring).

To implement custom scoring:
1. Edit `lib/scoring/config.ts` — update `DEFAULT_SCORING_CONFIG` and `computePlayerScore()`
2. Run a manual sync from `/admin` to recompute all entry scores

## Adding a Real Stats Provider

1. Create `lib/stats/providers/your-provider.ts`
2. Implement `StatsProvider` interface (getTournamentField, getLivePlayerStats, getLastUpdatedTime)
3. Add to switch in `getStatsProvider()` in `lib/stats/provider.ts`
4. Set `MASTERS_STATS_PROVIDER=your-provider` in env
