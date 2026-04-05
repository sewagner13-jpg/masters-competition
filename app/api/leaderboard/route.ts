import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/scoring/engine";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [leaderboard, lastSync] = await Promise.all([
      getLeaderboard(),
      prisma.syncRun.findFirst({
        where: { status: "success" },
        orderBy: { completedAt: "desc" },
        select: { completedAt: true },
      }),
    ]);

    return NextResponse.json({
      leaderboard,
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
