/**
 * Scoring engine — computes entry scores from PlayerStat records.
 *
 * Scoring buckets:
 *   scoreR1  = sum of 6 players' r1Pts  (Thursday)
 *   scoreR2  = sum of 6 players' r2Pts  (Friday)
 *   scoreR3  = sum of 6 players' r3Pts  (Saturday)
 *   scoreR4  = sum of 6 players' r4Pts  (Sunday Masters)
 *   sundayBonusPoints = from assigned SundayTeam.bonusPoints
 *   score (overall) = r1+r2+r3+r4+sundayBonus
 *
 * Daily prizes use scoreR1/R2/R3/R4 independently.
 * Overall prize uses score (overall).
 * Sunday bonus only counts toward overall.
 */

import { prisma } from "@/lib/prisma";
import { EVENT_NAME } from "@/lib/constants";

export interface PlayerScoreResult {
  playerId: string;
  playerName: string;
  position: string | null;
  thru: string | null;
  r1Pts: number;
  r2Pts: number;
  r3Pts: number;
  r4Pts: number;
}

export interface EntryScoreResult {
  entryId: string;
  userName: string;
  scoreR1: number;
  scoreR2: number;
  scoreR3: number;
  scoreR4: number;
  sundayBonusPoints: number;
  scoreOverall: number;
  players: PlayerScoreResult[];
  sundayRepName: string | null;
  sundayTeamName: string | null;
  publicMessage: string | null;
}

/** Recompute and persist scores for all active entries. Called after each sync. */
export async function computeAllEntryScores(): Promise<void> {
  const entries = await prisma.entry.findMany({
    where: { status: "active" },
    include: {
      players: {
        include: {
          player: {
            include: {
              stats: {
                where: { eventName: EVENT_NAME },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  for (const entry of entries) {
    let r1 = 0, r2 = 0, r3 = 0, r4 = 0;

    for (const ep of entry.players) {
      const stat = ep.player.stats[0];
      if (!stat) continue;
      r1 += stat.r1Pts ?? 0;
      r2 += stat.r2Pts ?? 0;
      r3 += stat.r3Pts ?? 0;
      r4 += stat.r4Pts ?? 0;
    }

    // Sunday bonus: look up assigned team
    let sundayBonus = entry.sundayBonusPoints;
    if (entry.sundayTeamName) {
      const team = await prisma.sundayTeam.findUnique({
        where: { teamName: entry.sundayTeamName },
      });
      if (team) sundayBonus = team.bonusPoints;
    }

    const overall = r1 + r2 + r3 + r4 + sundayBonus;

    await prisma.entry.update({
      where: { id: entry.id },
      data: {
        scoreR1: r1,
        scoreR2: r2,
        scoreR3: r3,
        scoreR4: r4,
        sundayBonusPoints: sundayBonus,
        score: overall,
      },
    });
  }
}

/** Current active round (1-4) based on today's date ET, or null if not in tournament */
export function getActiveRound(): 1 | 2 | 3 | 4 | null {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const month = et.getMonth() + 1; // 1-based
  const day = et.getDate();

  if (month !== 4) return null;
  if (day === 9)  return 1;  // Thursday
  if (day === 10) return 2;  // Friday
  if (day === 11) return 3;  // Saturday
  if (day === 12) return 4;  // Sunday
  return null;
}

/**
 * Get full leaderboard data.
 * Lock state is still returned separately for UI messaging and contest controls.
 */
export async function getLeaderboard(_isLocked: boolean): Promise<EntryScoreResult[]> {
  const entries = await prisma.entry.findMany({
    where: { status: "active" },
    orderBy: { score: "desc" }, // Higher = better (fantasy points)
    include: {
      players: {
        include: {
          player: {
            include: {
              stats: {
                where: { eventName: EVENT_NAME },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return entries.map((entry) => ({
    entryId: entry.id,
    userName: entry.userName,
    scoreR1: entry.scoreR1,
    scoreR2: entry.scoreR2,
    scoreR3: entry.scoreR3,
    scoreR4: entry.scoreR4,
    sundayBonusPoints: entry.sundayBonusPoints,
    scoreOverall: entry.score,
    players: entry.players.map((ep) => {
      const stat = ep.player.stats[0];
      return {
        playerId: ep.player.id,
        playerName: ep.player.name,
        position: stat?.position ?? null,
        thru: stat?.thru ?? null,
        r1Pts: stat?.r1Pts ?? 0,
        r2Pts: stat?.r2Pts ?? 0,
        r3Pts: stat?.r3Pts ?? 0,
        r4Pts: stat?.r4Pts ?? 0,
      };
    }),
    sundayRepName: entry.sundayRepName ?? null,
    sundayTeamName: entry.sundayTeamName ?? null,
    publicMessage: entry.publicMessage ?? null,
  }));
}
