/**
 * Sunday team management API
 *
 * GET  — list all Sunday teams
 * POST — create or update a Sunday team (name + hole scores)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { holeScoreToPoints } from "@/lib/scoring/config";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teams = await prisma.sundayTeam.findMany({ orderBy: { teamName: "asc" } });
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { teamName, holeScores } = body;
    // holeScores: [{ hole: 1, scoreToPar: -1 }, ...]

    if (!teamName) {
      return NextResponse.json({ error: "teamName is required" }, { status: 400 });
    }

    // Compute total bonus points from hole scores
    let bonusPoints = 0;
    const scoredHoles: { hole: number; scoreToPar: number; pts: number }[] = [];

    if (Array.isArray(holeScores)) {
      for (const h of holeScores) {
        const pts = holeScoreToPoints(Number(h.scoreToPar ?? 0));
        bonusPoints += pts;
        scoredHoles.push({ hole: h.hole, scoreToPar: h.scoreToPar, pts });
      }
    }

    const team = await prisma.sundayTeam.upsert({
      where: { teamName },
      update: { bonusPoints, holeScores: scoredHoles },
      create: { teamName, bonusPoints, holeScores: scoredHoles },
    });

    return NextResponse.json({ team });
  } catch (err) {
    console.error("[api/admin/sunday-team POST] Error:", err);
    return NextResponse.json({ error: "Failed to save Sunday team" }, { status: 500 });
  }
}
