/**
 * Sunday team management API
 *
 * GET  — list all Sunday teams
 * POST — create or update a Sunday team (name + hole scores)
 * DELETE — remove a Sunday team and clear linked entry assignments
 */

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { holeScoreToPoints } from "@/lib/scoring/config";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { computeAllEntryScores } from "@/lib/scoring/engine";

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
    const { teamId, teamName, holeScores } = body;
    // holeScores: [{ hole: 1, scoreToPar: -1 }, ...]

    const trimmedTeamName = String(teamName ?? "").trim();

    if (!trimmedTeamName) {
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

    let team;

    if (typeof teamId === "string" && teamId.trim()) {
      const existingTeam = await prisma.sundayTeam.findUnique({
        where: { id: teamId.trim() },
      });

      if (!existingTeam) {
        return NextResponse.json({ error: "Sunday team not found" }, { status: 404 });
      }

      team = await prisma.$transaction(async (tx) => {
        if (existingTeam.teamName !== trimmedTeamName) {
          await tx.entry.updateMany({
            where: { sundayTeamName: existingTeam.teamName },
            data: { sundayTeamName: trimmedTeamName },
          });
        }

        return tx.sundayTeam.update({
          where: { id: existingTeam.id },
          data: { teamName: trimmedTeamName, bonusPoints, holeScores: scoredHoles },
        });
      });
    } else {
      team = await prisma.sundayTeam.upsert({
        where: { teamName: trimmedTeamName },
        update: { bonusPoints, holeScores: scoredHoles },
        create: { teamName: trimmedTeamName, bonusPoints, holeScores: scoredHoles },
      });
    }

    await computeAllEntryScores();
    return NextResponse.json({ team });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A Sunday team with that name already exists." }, { status: 409 });
    }
    console.error("[api/admin/sunday-team POST] Error:", err);
    return NextResponse.json({ error: "Failed to save Sunday team" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const teamId = String(body?.teamId ?? "").trim();

    if (!teamId) {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 });
    }

    const existingTeam = await prisma.sundayTeam.findUnique({
      where: { id: teamId },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: "Sunday team not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const cleared = await tx.entry.updateMany({
        where: { sundayTeamName: existingTeam.teamName },
        data: {
          sundayTeamName: null,
          sundayBonusPoints: 0,
        },
      });

      await tx.sundayTeam.delete({ where: { id: existingTeam.id } });

      return {
        clearedAssignments: cleared.count,
        teamName: existingTeam.teamName,
      };
    });

    await computeAllEntryScores();

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[api/admin/sunday-team DELETE] Error:", err);
    return NextResponse.json({ error: "Failed to delete Sunday team" }, { status: 500 });
  }
}
