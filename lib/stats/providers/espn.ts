/**
 * ESPN Stats Provider - Masters Tournament
 *
 * Pulls the public leaderboard plus each competitor's scorecard summary.
 * Round fantasy points are computed from real hole-by-hole results only.
 * If a summary fetch fails, we leave round points unset so sync does not
 * overwrite previously correct stored scores with an approximation.
 */

import { HOLE_POINTS, holeScoreToPoints } from "@/lib/scoring/config";
import type { StatsProvider, PlayerStatData } from "../provider";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard";
const ESPN_SUMMARY_BASE = "https://site.web.api.espn.com/apis/site/v2/sports/golf";
const ESPN_TOUR = "pga";
const FETCH_TIMEOUT_MS = 12_000;
const SUMMARY_FETCH_CONCURRENCY = 12;

// ESPN API types (partial - only fields we use)

interface EspnLinkscore {
  value?: number;
  displayValue?: string;
}

interface EspnHoleScoreType {
  name?: string;
  displayName?: string;
  displayValue?: string;
}

interface EspnRoundHole {
  value?: number;
  displayValue?: string;
  period?: number;
  par?: number;
  scoreType?: EspnHoleScoreType;
}

interface EspnSummaryRound {
  value?: number;
  displayValue?: string;
  period?: number;
  linescores?: EspnRoundHole[];
}

interface EspnStatistic {
  name?: string;
  displayValue?: string;
}

interface EspnStatus {
  displayValue?: string;
  period?: number;
  displayThru?: string;
  teeTime?: string;
  thru?: number | { value?: number; displayValue?: string };
  position?: { displayName?: string };
  type?: { name?: string };
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

interface EspnCompetitorSummaryResponse {
  competitor?: { id?: string };
  rounds?: EspnSummaryRound[];
}

function parseRelativeToPar(raw: string | undefined): number | null {
  if (!raw) return null;

  const value = raw.trim().toUpperCase();
  if (value === "-" || value === "") return null;
  if (value === "E") return 0;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRoundScore(ls: EspnLinkscore | undefined): number | null {
  if (!ls) return null;
  return parseRelativeToPar(ls.displayValue);
}

function parseHoleStrokes(hole: EspnRoundHole): number | null {
  if (typeof hole.value === "number" && Number.isFinite(hole.value)) {
    return hole.value;
  }

  const parsed = Number(hole.displayValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function scoreHole(hole: EspnRoundHole): number | null {
  const strokes = parseHoleStrokes(hole);
  const par = typeof hole.par === "number" && Number.isFinite(hole.par) ? hole.par : null;

  if (strokes !== null && par !== null) {
    // ESPN reports aces on par 3s as generic "EAGLE", so detect the made-1 directly.
    if (strokes === 1) return HOLE_POINTS.hole_in_one;
    return holeScoreToPoints(strokes - par);
  }

  const scoreTypeToPar = parseRelativeToPar(hole.scoreType?.displayValue);
  return scoreTypeToPar === null ? null : holeScoreToPoints(scoreTypeToPar);
}

function scoreRoundExactly(round: EspnSummaryRound | undefined): number | null {
  const holes = round?.linescores ?? [];
  if (holes.length === 0) return null;

  let total = 0;
  for (const hole of holes) {
    const points = scoreHole(hole);
    if (points === null) return null;
    total += points;
  }

  return total;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );

  return results;
}

export class EspnStatsProvider implements StatsProvider {
  async getTournamentField(): Promise<PlayerStatData[]> {
    return this.getLivePlayerStats();
  }

  async getLivePlayerStats(): Promise<PlayerStatData[]> {
    const { eventId, competitors } = await this.fetchMastersCompetitors();

    if (competitors.length === 0) {
      console.warn("[ESPN] No Masters competitors found in API response");
      return [];
    }

    const summaryByCompetitorId =
      eventId !== null
        ? await this.fetchCompetitorSummaries(
            eventId,
            competitors.flatMap((competitor) =>
              competitor.athlete?.id ? [competitor.athlete.id] : []
            )
          )
        : new Map<string, EspnCompetitorSummaryResponse>();

    return competitors
      .filter((competitor) => !!competitor.athlete?.displayName)
      .map((competitor): PlayerStatData => {
        const competitorId = competitor.athlete?.id ?? null;
        const summary = competitorId ? summaryByCompetitorId.get(competitorId) ?? null : null;
        const name = competitor.athlete!.displayName!;
        const linescores = competitor.linescores ?? [];
        const statusType = competitor.status?.type?.name ?? null;

        const r1Raw = parseRoundScore(linescores[0]);
        const r2Raw = parseRoundScore(linescores[1]);
        const r3Raw = parseRoundScore(linescores[2]);
        const r4Raw = parseRoundScore(linescores[3]);

        const rawPosition = competitor.status?.position?.displayName ?? null;
        const position = rawPosition && rawPosition !== "-" ? rawPosition : null;

        let thru: string | null = null;
        const thruStat = competitor.statistics?.find((stat) => stat.name === "thru");
        if (statusType === "STATUS_SCHEDULED") {
          thru = null;
        } else if (thruStat?.displayValue) {
          thru = thruStat.displayValue;
        } else if (competitor.status?.displayThru) {
          thru = competitor.status.displayThru;
        } else if (
          typeof competitor.status?.thru === "number" &&
          competitor.status.thru > 0
        ) {
          thru = String(competitor.status.thru);
        } else if (
          competitor.status?.thru &&
          typeof competitor.status.thru === "object" &&
          competitor.status.thru.displayValue
        ) {
          thru = competitor.status.thru.displayValue;
        } else if (statusType === "STATUS_FINISHED") {
          thru = "F";
        }

        const round: number | null =
          typeof competitor.status?.period === "number"
            ? competitor.status.period
            : linescores.length > 0
              ? linescores.length
              : null;

        let holesCompleted: number | null = null;
        if (thru === "F") {
          holesCompleted = 18;
        } else if (thru) {
          const parsed = parseInt(thru, 10);
          if (!Number.isNaN(parsed)) holesCompleted = parsed;
        }

        const currentRoundSummary =
          round !== null
            ? summary?.rounds?.find((summaryRound) => summaryRound.period === round)
            : undefined;
        if (
          holesCompleted === null &&
          currentRoundSummary?.linescores &&
          currentRoundSummary.linescores.length > 0
        ) {
          holesCompleted = currentRoundSummary.linescores.length;
        }

        const exactPointsForRound = (roundNumber: number): number | null =>
          scoreRoundExactly(
            summary?.rounds?.find((summaryRound) => summaryRound.period === roundNumber)
          );

        const r1Pts = exactPointsForRound(1);
        const r2Pts = exactPointsForRound(2);
        const r3Pts = exactPointsForRound(3);
        const r4Pts = exactPointsForRound(4);

        const totalToPar = parseRelativeToPar(competitor.score?.displayValue);

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
            scoringSource: summary ? "hole_by_hole" : "summary_unavailable",
            status: competitor.status,
            score: competitor.score,
          },
        };
      });
  }

  async getLastUpdatedTime(): Promise<Date | null> {
    return new Date();
  }

  private async fetchMastersCompetitors(): Promise<{
    eventId: string | null;
    competitors: EspnCompetitor[];
  }> {
    const attempts = [
      { url: `${ESPN_BASE}?league=masters`, label: "masters league" },
      { url: ESPN_BASE, label: "default leaderboard" },
    ];

    for (const { url, label } of attempts) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SundayChurchMasters/1.0)" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          cache: "no-store",
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

        const event =
          events.find(
            (candidate) =>
              candidate.name?.toLowerCase().includes("masters") ||
              candidate.shortName?.toLowerCase().includes("masters")
          ) ?? events[0];

        const competitors = event?.competitions?.[0]?.competitors ?? [];
        if (competitors.length > 0) {
          console.log(
            `[ESPN] Found ${competitors.length} competitors via ${label} (event: ${event.name})`
          );
          return { eventId: event.id ?? null, competitors };
        }

        console.warn(`[ESPN] ${label}: event found but no competitors`);
      } catch (err) {
        console.warn(
          `[ESPN] ${label}: fetch error -`,
          err instanceof Error ? err.message : err
        );
      }
    }

    return { eventId: null, competitors: [] };
  }

  private async fetchCompetitorSummaries(
    eventId: string,
    competitorIds: string[]
  ): Promise<Map<string, EspnCompetitorSummaryResponse>> {
    const summaries = await mapWithConcurrency(
      competitorIds,
      SUMMARY_FETCH_CONCURRENCY,
      async (competitorId) => {
        const summary = await this.fetchCompetitorSummary(eventId, competitorId);
        return [competitorId, summary] as const;
      }
    );

    return new Map(
      summaries.flatMap(([competitorId, summary]) =>
        summary ? [[competitorId, summary] as const] : []
      )
    );
  }

  private async fetchCompetitorSummary(
    eventId: string,
    competitorId: string
  ): Promise<EspnCompetitorSummaryResponse | null> {
    const url =
      `${ESPN_SUMMARY_BASE}/${ESPN_TOUR}/leaderboard/${eventId}/competitorsummary/${competitorId}` +
      "?lang=en&region=us";

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SundayChurchMasters/1.0)" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        cache: "no-store",
      });

      if (!res.ok) {
        console.warn(`[ESPN] competitor summary ${competitorId}: HTTP ${res.status}`);
        return null;
      }

      return (await res.json()) as EspnCompetitorSummaryResponse;
    } catch (err) {
      console.warn(
        `[ESPN] competitor summary ${competitorId}: fetch error -`,
        err instanceof Error ? err.message : err
      );
      return null;
    }
  }
}
