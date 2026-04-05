import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitEntrySchema, validateSalaryCap } from "@/lib/validation";
import { SALARY_CAP } from "@/lib/constants";

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

    const { userName, playerIds } = parsed.data;

    // Fetch players and validate they exist and are active
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

    // Salary cap validation
    const { valid, total } = validateSalaryCap(players);
    if (!valid) {
      return NextResponse.json(
        {
          error: `Salary cap exceeded. Total $${total.toLocaleString()} exceeds cap of $${SALARY_CAP.toLocaleString()}.`,
        },
        { status: 400 }
      );
    }

    // Create entry + entryPlayers in a transaction
    const entry = await prisma.$transaction(async (tx) => {
      const newEntry = await tx.entry.create({
        data: {
          userName: userName.trim(),
          totalSalary: total,
          score: 0,
          status: "active",
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

    return NextResponse.json({ entryId: entry.id }, { status: 201 });
  } catch (err) {
    console.error("[api/entries] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit entry. Please try again." },
      { status: 500 }
    );
  }
}
