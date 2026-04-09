/**
 * ESPN Stats Provider — Masters Tournament
 *
 * Fetches live leaderboard data from ESPN's public golf API and maps it to
 * PlayerStatData with per-round fantasy points pre-computed.
 *
 * Fantasy point formula (approximation from round total when hole-by-hole is unavailable):
 *   Baseline = 18 holes × 0.5 (all pars) = 9 pts
 *   Under par: each stroke under par assumed birdie → +2.5 pts above baseline per stroke
 *   Over par:  each stroke over par assumed bogey  → −1.5 pts below baseline per stroke
 */

import type { StatsProvider, PlayerStatData } from "../provider";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard";
const FETCH_TIMEOUT_MS = 12_000;

// ─── ESPN API types (partial — only fields we use) ───────────────────────────

interface EspnLinkscore {
  value?: number;
  displayValue?: string;
}

interface EspnStatistic {
  name?: string;
  displayValue?: string;
}

interface EspnStatus {
  displayValue?: string; // position: "1", "T3", "MC", "WD", "CUT"
  period?: number;       // current round number 1-4
  thru?: { value?: number; displayValue?: string };
  type?: { name?: string }; // "STATUS_IN_PROGRESS", "STATUS_FINISHED", etc.
}

interface EspnAthlete {
  id?: string;
  displayName?: string;
}

interface EspnCompetitor {
  athlete?: EspnAthlete;
  status?: EspnStatus;
  score?: { value?: number; displayValue?: string };
  linescores?: EspnLinkscore[];
  statistics?: EspnStatistic[];
}

interface EspnCompetition {
  competitors?: EspnCompetitor[];
}

interface EspnEvent {
  id?: string;
  name?: string;
  shortName?: string;
  competitions?: EspnCompetition[];
}

interface EspnResponse {
  events?: EspnEvent[];
}

// ─── Fantasy point approximation ─────────────────────────────────────────────

/**
 * Converts a round score-to-par to approximate fantasy points using the
 * simplified hole-distribution model (all under-par = birdies; all over-par = bogeys).
 *
 * Points per hole: birdie=3, par=0.5, bogey=-1
 * Baseline (18 pars): 9 pts
 * Under par: 9 + |score| × 2.5  (birdie upgrade = 3 − 0.5 = +2.5)
 * Over par:  9 − |score| × 1.5  (bogey downgrade = −1 − 0.5 = −1.5)
 */
function roundScoreToPts(scoreToPar: number): number {
  const baseline = 9; // 18 × 0.5
  if (scoreToPar < 0) return baseline + Math.abs(scoreToPar) * 2.5;
  if (scoreToPar > 0) return Math.max(0, baseline - scoreToPar * 1.5);
  return baseline;
}

// ─── ESPN Stats Provider ──────────────────────────────────────────────────────

export class EspnStatsProvider implements StatsProvider {
  async getTournamentField(): Promise<PlayerStatData[]> {
    return this.getLivePlayerStats();
  }

  async getLivePlayerStats(): Promise<PlayerStatData[]> {
    const competitors = await this.fetchMastersCompetitors();

    if (competitors.length === 0) {
      console.warn("[ESPN] No Masters competitors found in API response");
      return [];
    }

    return competitors
      .filter((c) => !!c.athlete?.displayName)
      .map((c): PlayerStatData => {
        const name = c.athlete!.displayName!;
        const linescores = c.linescores ?? [];

        /**
         * ESPN quirk: unplayed rounds still have a linescore entry with
         *   value: 0, displayValue: "-"
         * A played round (even par) has:
         *   value: 0, displayValue: "E" or a number
         * We treat "-" displayValue as "not played" → null pts.
         */
        function parseRoundScore(ls: EspnLinkscore | undefined): number | null {
          if (!ls) return null;
          const dv = ls.displayValue ?? "";
          if (dv === "-" || dv === "") return null; // not yet played
          if (typeof ls.value === "number") return ls.value;
          return null;
        }

        const r1Raw = parseRoundScore(linescores[0]);
        const r2Raw = parseRoundScore(linescores[1]);
        const r3Raw = parseRoundScore(linescores[2]);
        const r4Raw = parseRoundScore(linescores[3]);

        // Convert to fantasy points only for rounds that have been played
        const r1Pts = r1Raw !== null ? roundScoreToPts(r1Raw) : null;
        const r2Pts = r2Raw !== null ? roundScoreToPts(r2Raw) : null;
        const r3Pts = r3Raw !== null ? roundScoreToPts(r3Raw) : null;
        const r4Pts = r4Raw !== null ? roundScoreToPts(r4Raw) : null;

        // Position string: "T1", "1", "MC", "WD", "CUT"
        const position = c.status?.displayValue ?? null;

        // "Thru" — check statistics array first, then status.thru
        let thru: string | null = null;
        const thruStat = c.statistics?.find((s) => s.name === "thru");
        if (thruStat?.displayValue) {
          thru = thruStat.displayValue;
        } else if (c.status?.thru?.displayValue) {
          thru = c.status.thru.displayValue;
        }

        // Current round (1-4) from status.period or inferred from linescores length
        const round: number | null =
          typeof c.status?.period === "number"
            ? c.status.period
            : linescores.length > 0
            ? linescores.length
            : null;

        // Holes completed this round
        let holesCompleted: number | null = null;
        if (thru === "F") {
          holesCompleted = 18;
        } else if (thru) {
          const n = parseInt(thru, 10);
          if (!isNaN(n)) holesCompleted = n;
        }

        // Total score to par (cumulative)
        const totalToPar =
          typeof c.score?.value === "number" ? c.score.value : null;

        return {
          name,
          position,
          thru,
          totalToPar,
          holesCompleted,
          round,
          r1Pts,
          r2Pts,
          r3Pts,
          r4Pts,
          rawPayload: {
            espnName: name,
            linescores,
            roundScores: { r1: r1Raw, r2: r2Raw, r3: r3Raw, r4: r4Raw },
            status: c.status,
            score: c.score,
          },
        };
      });
  }

  async getLastUpdatedTime(): Promise<Date | null> {
    return new Date(); // ESPN data is always live
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async fetchMastersCompetitors(): Promise<EspnCompetitor[]> {
    // Try two URL patterns — ESPN routes Masters differently depending on context
    const attempts = [
      { url: `${ESPN_BASE}?league=masters`, label: "masters league" },
      { url: ESPN_BASE, label: "default leaderboard" },
    ];

    for (const { url, label } of attempts) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SundayChurchMasters/1.0)" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          cache: "no-store", // always fetch fresh data — never cache
        });

        if (!res.ok) {
          console.warn(`[ESPN] ${label}: HTTP ${res.status}`);
          continue;
        }

        const data = (await res.json()) as EspnResponse;
        const events = data.events ?? [];

        if (events.length === 0) {
          console.warn(`[ESPN] ${label}: no events in response`);
          continue;
        }

        // Prefer an event with "masters" in the name; fall back to first event
        const event =
          events.find(
            (e) =>
              e.name?.toLowerCase().includes("masters") ||
              e.shortName?.toLowerCase().includes("masters")
          ) ?? events[0];

        const competitors = event?.competitions?.[0]?.competitors ?? [];
        if (competitors.length > 0) {
          console.log(
            `[ESPN] Found ${competitors.length} competitors via ${label} (event: ${event.name})`
          );
          return competitors;
        }

        console.warn(`[ESPN] ${label}: event found but no competitors`);
      } catch (err) {
        console.warn(`[ESPN] ${label}: fetch error —`, err instanceof Error ? err.message : err);
      }
    }

    return [];
  }
}
