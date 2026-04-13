import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getActiveRound } from "@/lib/scoring/engine";
import { prisma } from "@/lib/prisma";
import { isContestLocked } from "@/lib/lock";
import { runStatSync } from "@/lib/stats/sync";

export const dynamic = "force-dynamic";

const LEADERBOARD_SYNC_STALE_MS = 55_000;
const RUNNING_SYNC_GRACE_MS = 90_000;
const RECENT_SYNC_ATTEMPT_MS = 20_000;

async function maybeRefreshLeaderboardStats(activeRound: 1 | 2 | 3 | 4 | null) {
  if (activeRound === null) return;

  const now = Date.now();

  const [latestRun, lastSuccess] = await Promise.all([
    prisma.syncRun.findFirst({
      orderBy: { startedAt: "desc" },
      select: { status: true, startedAt: true },
    }),
    prisma.syncRun.findFirst({
      where: { status: "success" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
  ]);

  const hasRecentSuccess =
    !!lastSuccess?.completedAt &&
    now - lastSuccess.completedAt.getTime() < LEADERBOARD_SYNC_STALE_MS;

  const hasRunningSync =
    latestRun?.status === "running" &&
    now - latestRun.startedAt.getTime() < RUNNING_SYNC_GRACE_MS;

  const hasRecentAttempt =
    !!latestRun &&
    now - latestRun.startedAt.getTime() < RECENT_SYNC_ATTEMPT_MS;

  if (hasRecentSuccess || hasRunningSync || hasRecentAttempt) return;

  try {
    await runStatSync({ forceSync: true });
  } catch (err) {
    console.error("[api/leaderboard] Auto-sync failed:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const activeRound = getActiveRound();
    await maybeRefreshLeaderboardStats(activeRound);

    const settings = await prisma.contestSettings.findUnique({ where: { id: "main" } });
    const locked = isContestLocked(settings);

    const [leaderboard, lastSync] = await Promise.all([
      getLeaderboard(locked),
      prisma.syncRun.findFirst({
        where: { status: "success" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
    ]);

    return NextResponse.json({
      leaderboard,
      isLocked: locked,
      activeRound,
      contestEndedAt: settings?.endedAt ?? null,
      lastSyncedAt: lastSync?.completedAt ?? null,
    });
  } catch (err) {
    console.error("[api/leaderboard] Error:", err);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}
