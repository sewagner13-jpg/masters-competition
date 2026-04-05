import { NextRequest, NextResponse } from "next/server";
import { getLeaderboard, getActiveRound } from "@/lib/scoring/engine";
import { prisma } from "@/lib/prisma";
import { isContestLocked } from "@/lib/lock";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const settings = await prisma.contestSettings.findUnique({ where: { id: "main" } });
    const locked = isContestLocked(settings);
    const activeRound = getActiveRound();

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
