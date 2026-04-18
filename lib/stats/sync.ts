/**
 * Stat sync service.
 *
 * Called by:
 *   - Netlify scheduled function (automatic, every 15 min during ET hours)
 *   - Admin page manual trigger (POST /api/admin/sync)
 *
 * Always logs to SyncRun table regardless of outcome.
 */

import { prisma } from "@/lib/prisma";
import { getStatsProvider } from "./provider";
import { computeAllEntryScores } from "@/lib/scoring/engine";
import { EVENT_NAME } from "@/lib/constants";
import { isWithinSyncSeason, isWithinSyncWindow } from "@/lib/timezone";

export interface SyncResult {
  status: "success" | "failed" | "skipped";
  message: string;
  recordsUpdated: number;
}

/**
 * Normalize a player name for DB lookup by stripping diacritics.
 * ESPN returns accented names (e.g. "Ludvig Åberg", "Rasmus Højgaard") while
 * our Player table stores ASCII equivalents ("Ludvig Aberg", "Rasmus Hojgaard").
 */
const PLAYER_NAME_ALIASES: Record<string, string> = {
  "Ludvig Åberg": "Ludvig Aberg",
  "Sergio García": "Sergio Garcia",
  "José María Olazábal": "Jose Maria Olazabal",
  "Ángel Cabrera": "Angel Cabrera",
  "Sami Välimäki": "Sami Valimaki",
  "Nicolai Højgaard": "Nicolai Hojgaard",
  "Rasmus Højgaard": "Rasmus Hojgaard",
  "Nico Echavarria": "Nicolas Echavarria",
  "Johnny Keefer": "John Keefer",
};

function normalizeName(name: string): string {
  return name
    .replace(/[øØ]/g, "o")
    .replace(/[æÆ]/g, "ae")
    .replace(/[œŒ]/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export async function runStatSync(options?: {
  forceSync?: boolean; // bypass time window check (for manual admin trigger)
}): Promise<SyncResult> {
  const forceSync = options?.forceSync ?? false;

  if (!isWithinSyncSeason()) {
    const run = await prisma.syncRun.create({
      data: { status: "skipped", message: "Outside Masters sync season", completedAt: new Date() },
    });
    console.log(`[sync] Skipped — outside Masters sync season (run ${run.id})`);
    return { status: "skipped", message: "Outside Masters sync season", recordsUpdated: 0 };
  }

  // Check time window unless forced
  if (!forceSync && !isWithinSyncWindow()) {
    const run = await prisma.syncRun.create({
      data: { status: "skipped", message: "Outside sync window", completedAt: new Date() },
    });
    console.log(`[sync] Skipped — outside ET sync window (run ${run.id})`);
    return { status: "skipped", message: "Outside sync window", recordsUpdated: 0 };
  }

  // Check SYNC_ENABLED
  if (!forceSync && process.env.SYNC_ENABLED === "false") {
    await prisma.syncRun.create({
      data: { status: "skipped", message: "SYNC_ENABLED is false", completedAt: new Date() },
    });
    return { status: "skipped", message: "Sync disabled", recordsUpdated: 0 };
  }

  const run = await prisma.syncRun.create({ data: { status: "running" } });

  try {
    const provider = getStatsProvider();
    const stats = await provider.getLivePlayerStats();

    let recordsUpdated = 0;

    for (const stat of stats) {
      const aliasedName = PLAYER_NAME_ALIASES[stat.name] ?? stat.name;

      // Try exact match first, then normalized (ASCII) match for accented names
      const normalizedStatName = normalizeName(aliasedName);
      const player =
        (await prisma.player.findFirst({
          where: { name: aliasedName, isActive: true },
        })) ??
        (normalizedStatName !== aliasedName
          ? await prisma.player.findFirst({
              where: { name: normalizedStatName, isActive: true },
            })
          : null);

      if (!player) continue;

      // Only overwrite per-round pts if the provider supplied them
      const roundPtsUpdate: Record<string, number> = {};
      if (stat.r1Pts != null) roundPtsUpdate.r1Pts = stat.r1Pts;
      if (stat.r2Pts != null) roundPtsUpdate.r2Pts = stat.r2Pts;
      if (stat.r3Pts != null) roundPtsUpdate.r3Pts = stat.r3Pts;
      if (stat.r4Pts != null) roundPtsUpdate.r4Pts = stat.r4Pts;

      await prisma.playerStat.upsert({
        where: { playerId_eventName: { playerId: player.id, eventName: EVENT_NAME } },
        update: {
          position: stat.position,
          thru: stat.thru,
          totalToPar: stat.totalToPar,
          holesCompleted: stat.holesCompleted,
          round: stat.round,
          rawStatPayload: (stat.rawPayload ?? {}) as object,
          lastSyncedAt: new Date(),
          ...roundPtsUpdate,
        },
        create: {
          playerId: player.id,
          eventName: EVENT_NAME,
          position: stat.position,
          thru: stat.thru,
          totalToPar: stat.totalToPar,
          holesCompleted: stat.holesCompleted,
          round: stat.round,
          rawStatPayload: (stat.rawPayload ?? {}) as object,
          r1Pts: stat.r1Pts ?? null,
          r2Pts: stat.r2Pts ?? null,
          r3Pts: stat.r3Pts ?? null,
          r4Pts: stat.r4Pts ?? null,
        },
      });

      recordsUpdated++;
    }

    // Recompute all entry scores after stat update
    await computeAllEntryScores();

    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        completedAt: new Date(),
        recordsUpdated,
        message: `Synced ${recordsUpdated} player stat records`,
      },
    });

    console.log(`[sync] Success — ${recordsUpdated} records updated (run ${run.id})`);
    return { status: "success", message: `Synced ${recordsUpdated} records`, recordsUpdated };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "failed", completedAt: new Date(), message },
    });
    console.error(`[sync] Failed (run ${run.id}):`, message);
    return { status: "failed", message, recordsUpdated: 0 };
  }
}
