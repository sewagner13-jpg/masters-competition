/**
 * Commissioner settings API
 *
 * GET  /api/admin/settings        — load all entries with Sunday fields + lock state
 * POST /api/admin/settings        — update Sunday rep/team/isPlayingSunday for an entry
 * PATCH /api/admin/settings       — lock/unlock/finalize contest controls
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLockState } from "@/lib/lock";
import { LOCK_DEADLINE } from "@/lib/constants";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { computeAllEntryScores } from "@/lib/scoring/engine";

export const dynamic = "force-dynamic";

/** GET — return all entries (with Sunday fields + rosters) + current lock state */
export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [entries, settings] = await Promise.all([
    prisma.entry.findMany({
      orderBy: { submittedAt: "asc" },
      select: {
        id: true,
        userName: true,
        sundayRepName: true,
        sundayTeamName: true,
        isPlayingSunday: true,
        publicMessage: true,
        scoreR1: true,
        scoreR2: true,
        scoreR3: true,
        scoreR4: true,
        sundayBonusPoints: true,
        score: true,
        status: true,
        players: {
          select: {
            player: {
              select: {
                id: true,
                name: true,
                salary: true,
              },
            },
          },
        },
      },
    }),
    prisma.contestSettings.findUnique({ where: { id: "main" } }),
  ]);

  const lockState = getLockState(settings);

  return NextResponse.json({
    entries,
    lockState,
    contestEndedAt: settings?.endedAt ?? null,
    lockDeadline: LOCK_DEADLINE.toISOString(),
    settings: settings ?? { id: "main", isForceUnlocked: false, lockedAt: null, endedAt: null },
  });
}

/** POST — update Sunday rep/team/isPlayingSunday for one entry */
export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { entryId, sundayRepName, sundayTeamName, isPlayingSunday } = body;

    if (!entryId) {
      return NextResponse.json({ error: "entryId is required" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (sundayRepName !== undefined) updateData.sundayRepName = sundayRepName || null;
    if (sundayTeamName !== undefined) updateData.sundayTeamName = sundayTeamName || null;
    if (isPlayingSunday !== undefined) updateData.isPlayingSunday = Boolean(isPlayingSunday);

    await prisma.entry.update({ where: { id: entryId }, data: updateData });
    await computeAllEntryScores();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/settings POST] Error:", err);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

/** PATCH — toggle force-lock, force-unlock, or contest finalization */
export async function PATCH(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;
    // "force_lock" | "force_unlock" | "clear_override" | "end_contest" | "reopen_contest"

    const existing = await prisma.contestSettings.findUnique({ where: { id: "main" } });
    let data: Record<string, unknown> = {};

    if (action === "force_lock") {
      data = { lockedAt: new Date(), isForceUnlocked: false };
    } else if (action === "force_unlock") {
      data = { isForceUnlocked: true, lockedAt: null };
    } else if (action === "clear_override") {
      data = { isForceUnlocked: false, lockedAt: null };
    } else if (action === "end_contest") {
      data = {
        endedAt: new Date(),
        isForceUnlocked: false,
        lockedAt: existing?.lockedAt ?? new Date(),
      };
    } else if (action === "reopen_contest") {
      data = { endedAt: null };
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    await prisma.contestSettings.upsert({
      where: { id: "main" },
      update: data,
      create: { id: "main", ...data },
    });

    const updated = await prisma.contestSettings.findUnique({ where: { id: "main" } });

    return NextResponse.json({
      ok: true,
      contestEndedAt: updated?.endedAt ?? null,
    });
  } catch (err) {
    console.error("[api/admin/settings PATCH] Error:", err);
    return NextResponse.json({ error: "Failed to update lock state" }, { status: 500 });
  }
}
