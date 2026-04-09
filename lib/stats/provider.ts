/**
 * Stats provider abstraction.
 *
 * All stat fetching goes through this interface. Swap the implementation
 * by changing MASTERS_STATS_PROVIDER in your .env without touching
 * anything else in the app.
 *
 * Supported values:
 *   mock  — returns empty data (default; scores show 0 until real provider set)
 *   espn  — fetches live data from ESPN's public golf API (use this for tournament)
 */

export interface PlayerStatData {
  name: string;
  position: string | null;
  thru: string | null;
  totalToPar: number | null;
  holesCompleted: number | null;
  round: number | null;
  /**
   * Per-round fantasy points, pre-computed by the provider.
   * Null = round not yet played. When present, sync.ts writes these
   * directly to PlayerStat.r1Pts–r4Pts so entry scores update automatically.
   */
  r1Pts?: number | null;
  r2Pts?: number | null;
  r3Pts?: number | null;
  r4Pts?: number | null;
  rawPayload?: Record<string, unknown>;
}

export interface StatsProvider {
  getTournamentField(): Promise<PlayerStatData[]>;
  getLivePlayerStats(): Promise<PlayerStatData[]>;
  getLastUpdatedTime(): Promise<Date | null>;
}

// ------------------------------------------------------------------
// Mock provider — returns empty data so the app works end-to-end
// before a real stats source is wired in.
// ------------------------------------------------------------------
export class MockStatsProvider implements StatsProvider {
  async getTournamentField(): Promise<PlayerStatData[]> {
    return [];
  }

  async getLivePlayerStats(): Promise<PlayerStatData[]> {
    return [];
  }

  async getLastUpdatedTime(): Promise<Date | null> {
    return null;
  }
}

// ------------------------------------------------------------------
// Factory — returns the right provider based on env config
// ------------------------------------------------------------------
export function getStatsProvider(): StatsProvider {
  const provider = process.env.MASTERS_STATS_PROVIDER ?? "mock";

  switch (provider) {
    case "mock":
      return new MockStatsProvider();

    case "espn": {
      // Direct import — works in Next.js ESM/Turbopack without require()
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { EspnStatsProvider } = require("./providers/espn") as typeof import("./providers/espn");
      return new EspnStatsProvider();
    }

    default:
      console.warn(`[stats] Unknown provider "${provider}", falling back to mock`);
      return new MockStatsProvider();
  }
}
