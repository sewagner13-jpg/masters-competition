import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitEntrySchema, validateSalaryCap } from "@/lib/validation";
import { SALARY_CAP } from "@/lib/constants";
import { hashCode } from "@/lib/editCode";
import { isContestLocked } from "@/lib/lock";
import { computeAllEntryScores } from "@/lib/scoring/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = submitEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { userName, playerIds, editCode, publicMessage } = parsed.data;

    // Check contest lock
    const settings = await prisma.contestSettings.findUnique({ where: { id: "main" } });
    if (isContestLocked(settings)) {
      return NextResponse.json(
        { error: "The contest is locked. No new entries are being accepted." },
        { status: 403 }
      );
    }

    // One entry per name — reject duplicate entry names
    const existing = await prisma.entry.findUnique({ where: { userName } });
    if (existing) {
      return NextResponse.json(
        { error: `An entry named "${userName}" already exists. Each person may only submit one lineup.` },
        { status: 409 }
      );
    }

    // Fetch players — validate they exist and are active
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds }, isActive: true },
      select: { id: true, name: true, salary: true },
    });

    if (players.length !== playerIds.length) {
      return NextResponse.json(
        { error: "One or more selected players are inactive or do not exist." },
        { status: 400 }
      );
    }

    // Salary cap validation (server-side)
    const { valid, total } = validateSalaryCap(players);
    if (!valid) {
      return NextResponse.json(
        {
          error: `Salary cap exceeded. Total $${total.toLocaleString()} exceeds the $${SALARY_CAP.toLocaleString()} cap.`,
        },
        { status: 400 }
      );
    }

    // Hash personal edit code if provided
    const editCodeHash =
      editCode && editCode.trim().length >= 4
        ? hashCode(editCode.trim())
        : null;

    // Create entry + entryPlayers in a transaction
    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.entry.create({
        data: {
          userName: userName.trim(),
          totalSalary: total,
          score: 0,
          status: "active",
          editCodeHash,
          publicMessage: publicMessage?.trim() || null,
        },
      });

      await tx.entryPlayer.createMany({
        data: playerIds.map((playerId) => ({
          entryId: newEntry.id,
          playerId,
        })),
      });

      return newEntry;
    });

    await computeAllEntryScores();

    return NextResponse.json({ entryId: entry.id }, { status: 201 });
  } catch (err) {
    console.error("[api/entries] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit entry. Please try again." },
      { status: 500 }
    );
  }
}
