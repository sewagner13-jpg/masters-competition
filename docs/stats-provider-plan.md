# Stats Provider Plan

## Current State

The app uses `MockStatsProvider` which returns empty arrays.
Players show "--" on the leaderboard until a real provider is wired in.
This is intentional — the app is fully functional without live stats.

## Provider Interface

Defined in `lib/stats/provider.ts`:

```typescript
interface StatsProvider {
  getTournamentField(): Promise<PlayerStatData[]>;
  getLivePlayerStats(): Promise<PlayerStatData[]>;
  getLastUpdatedTime(): Promise<Date | null>;
}

interface PlayerStatData {
  name: string;           // Must match Player.name in DB exactly
  position: string | null; // "1", "T3", "CUT", "WD"
  thru: string | null;    // "F", "9", "14"
  totalToPar: number | null;
  holesCompleted: number | null;
  round: number | null;
  rawPayload?: Record<string, unknown>;
}
```

## How to Add a Real Provider

1. Create `lib/stats/providers/your-provider.ts`
2. Implement `StatsProvider`
3. Register in `getStatsProvider()` switch in `lib/stats/provider.ts`
4. Set `MASTERS_STATS_PROVIDER=your-provider` in env

## Matching Player Names

The sync service matches stats to players by `Player.name` (exact string match).
If provider names differ from your seeded names, add a name normalization step
in your provider's `getLivePlayerStats()` implementation.

## Candidate Data Sources

- **Official Masters API**: Check masters.com for any available data endpoints
- **ESPN API**: `site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard` — unofficial but widely used
- **PGA Tour API**: `statsdata.pgatour.com` — may require licensing
- **Sports Radar / Sportradar**: Licensed golf data API

Keep all scraping/fetching logic isolated inside the provider class.
Never put HTTP requests in the sync service or scoring engine.

## Rollout Plan

1. Build provider behind `MASTERS_STATS_PROVIDER=espn` (or similar)
2. Test locally with `npm run dev` and trigger sync via `/admin`
3. Confirm `PlayerStat` records appear in DB
4. Confirm leaderboard scores update
5. Deploy to Netlify and test scheduled sync
