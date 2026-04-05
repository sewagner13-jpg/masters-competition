/**
 * Scoring engine — computes entry scores from current PlayerStat records.
 *
 * Decoupled from the UI and from the stat provider. Just reads the DB
 * and applies the scoring config.
 */

import { prisma } from "@/lib/prisma";
import { computePlayerScore, DEFAULT_SCORING_CONFIG } from "./config";
import { EVENT_NAME } from "@/lib/constants";

export interface PlayerScoreResult {
  playerId: string;
  playerName: string;
  position: string | null;
  thru: string | null;
  totalToPar: number | null;
  fantasyScore: number;
}

export interface EntryScoreResult {
  entryId: string;
  userName: string;
  totalScore: number;
  players: PlayerScoreResult[];
}

/**
 * Compute scores for all active entries.
 * Called by the sync job after stats are updated.
 */
export async function computeAllEntryScores(): Promise<void> {
  const entries = await prisma.entry.findMany({
    where: { status: "active" },
    include: {
      players: {
        include: {
          player: {
            include: {
              entries: {
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
    let totalScore = 0;

    for (const ep of entry.players) {
      const stat = ep.player.entries[0];
      const playerScore = computePlayerScore(
        stat?.totalToPar,
        stat?.position,
        DEFAULT_SCORING_CONFIG
      );
      totalScore += playerScore;
    }

    await prisma.entry.update({
      where: { id: entry.id },
      data: { score: totalScore },
    });
  }
}

/**
 * Get scored leaderboard data for display.
 */
export async function getLeaderboard(): Promise<EntryScoreResult[]> {
  const entries = await prisma.entry.findMany({
    where: { status: "active" },
    orderBy: { score: "asc" }, // Lower = better (golf scoring)
    include: {
      players: {
        include: {
          player: {
            include: {
              entries: {
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
    totalScore: entry.score,
    players: entry.players.map((ep) => {
      const stat = ep.player.entries[0];
      return {
        playerId: ep.player.id,
        playerName: ep.player.name,
        position: stat?.position ?? null,
        thru: stat?.thru ?? null,
        totalToPar: stat?.totalToPar ?? null,
        fantasyScore: computePlayerScore(
          stat?.totalToPar,
          stat?.position,
          DEFAULT_SCORING_CONFIG
        ),
      };
    }),
  }));
}
