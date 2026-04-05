/**
 * Stats provider abstraction.
 *
 * All stat fetching goes through this interface. Swap the implementation
 * by changing MASTERS_STATS_PROVIDER in your .env without touching
 * anything else in the app.
 *
 * To add a real provider:
 *   1. Create lib/stats/providers/your-provider.ts
 *   2. Implement the StatsProvider interface
 *   3. Add it to the switch in getStatsProvider()
 */

export interface PlayerStatData {
  name: string;
  position: string | null;
  thru: string | null;
  totalToPar: number | null;
  holesCompleted: number | null;
  round: number | null;
  rawPayload?: Record<string, unknown>;
}

export interface StatsProvider {
  getTournamentField(): Promise<PlayerStatData[]>;
  getLivePlayerStats(): Promise<PlayerStatData[]>;
  getLastUpdatedTime(): Promise<Date | null>;
}

// ------------------------------------------------------------------
// Mock provider — returns placeholder data so the app works end-to-end
// before a real stats source is wired in.
// ------------------------------------------------------------------
export class MockStatsProvider implements StatsProvider {
  async getTournamentField(): Promise<PlayerStatData[]> {
    return [];
  }

  async getLivePlayerStats(): Promise<PlayerStatData[]> {
    // Returns empty — no mock scores so the leaderboard just shows 0s
    // until a real provider is plugged in.
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

    // Add real providers here:
    // case "espn":
    //   return new EspnStatsProvider();
    // case "pga":
    //   return new PgaStatsProvider();

    default:
      console.warn(`Unknown stats provider "${provider}", falling back to mock`);
      return new MockStatsProvider();
  }
}
