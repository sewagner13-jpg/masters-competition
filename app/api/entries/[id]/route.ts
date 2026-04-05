import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editEntrySchema, validateSalaryCap } from "@/lib/validation";
import { SALARY_CAP, COMMISSIONER_CODE } from "@/lib/constants";
import { verifyCode, hashCode } from "@/lib/editCode";
import { isContestLocked } from "@/lib/lock";

export const dynamic = "force-dynamic";

/** GET a single entry (public fields only — no edit code hash exposed) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        players: {
          include: { player: { select: { id: true, name: true, salary: true } } },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      entry: {
        id: entry.id,
        userName: entry.userName,
        publicMessage: entry.publicMessage,
        sundayRepName: entry.sundayRepName,
        sundayTeamName: entry.sundayTeamName,
        hasEditCode: !!entry.editCodeHash,
        totalSalary: entry.totalSalary,
        players: entry.players.map((ep) => ({
          id: ep.player.id,
          name: ep.player.name,
          salary: ep.player.salary,
        })),
      },
    });
  } catch (err) {
    console.error("[api/entries/[id] GET] Error:", err);
    return NextResponse.json({ error: "Failed to load entry" }, { status: 500 });
  }
}

/** PUT — edit an existing entry (requires personal code or commissioner master code) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = editEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { code, userName, playerIds, publicMessage } = parsed.data;

    // Load entry
    const entry = await prisma.entry.findUnique({
      where: { id },
      include: {
        players: { include: { player: { select: { id: true, salary: true } } } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const isCommissioner = code === COMMISSIONER_CODE;

    // Verify personal edit code if not commissioner
    if (!isCommissioner) {
      if (!entry.editCodeHash) {
        return NextResponse.json(
          { error: "This entry has no personal code set. Contact the commissioner to make changes." },
          { status: 403 }
        );
      }
      if (!verifyCode(code, entry.editCodeHash)) {
        return NextResponse.json(
          { error: "Incorrect personal code." },
          { status: 403 }
        );
      }
    }

    // Check lock — normal users blocked after lock, commissioner always allowed
    const settings = await prisma.contestSettings.findUnique({ where: { id: "main" } });
    if (!isCommissioner && isContestLocked(settings)) {
      return NextResponse.json(
        { error: "The contest is locked. Lineups can no longer be edited." },
        { status: 403 }
      );
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (userName !== undefined) {
      // Check uniqueness if name is changing
      if (userName.trim() !== entry.userName) {
        const conflict = await prisma.entry.findUnique({ where: { userName: userName.trim() } });
        if (conflict) {
          return NextResponse.json(
            { error: `The name "${userName.trim()}" is already taken.` },
            { status: 409 }
          );
        }
      }
      updateData.userName = userName.trim();
    }

    if (publicMessage !== undefined) {
      updateData.publicMessage = publicMessage.trim() || null;
    }

    // Commissioner can reset the edit code (pass newEditCode in body)
    if (isCommissioner && body.newEditCode) {
      updateData.editCodeHash = hashCode(String(body.newEditCode).trim());
    }

    // Roster change
    if (playerIds !== undefined) {
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds }, isActive: true },
        select: { id: true, salary: true },
      });

      if (players.length !== playerIds.length) {
        return NextResponse.json(
          { error: "One or more selected players are inactive or do not exist." },
          { status: 400 }
        );
      }

      const { valid, total } = validateSalaryCap(players);
      if (!valid) {
        return NextResponse.json(
          { error: `Salary cap exceeded. Total $${total.toLocaleString()} exceeds $${SALARY_CAP.toLocaleString()}.` },
          { status: 400 }
        );
      }

      updateData.totalSalary = total;

      // Replace roster in transaction
      await prisma.$transaction([
        prisma.entryPlayer.deleteMany({ where: { entryId: id } }),
        prisma.entryPlayer.createMany({
          data: playerIds.map((playerId) => ({ entryId: id, playerId })),
        }),
        prisma.entry.update({ where: { id }, data: updateData }),
      ]);

      return NextResponse.json({ ok: true });
    }

    // No roster change — just update metadata
    if (Object.keys(updateData).length > 0) {
      await prisma.entry.update({ where: { id }, data: updateData });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/entries/[id] PUT] Error:", err);
    return NextResponse.json({ error: "Failed to update entry." }, { status: 500 });
  }
}

/** DELETE — remove an existing entry (requires personal code or commissioner master code) */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const code = String(body?.code ?? "").trim();

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 });
    }

    const entry = await prisma.entry.findUnique({ where: { id } });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const isCommissioner = code === COMMISSIONER_CODE;

    if (!isCommissioner) {
      if (!entry.editCodeHash) {
        return NextResponse.json(
          { error: "This entry has no personal code set. Contact the commissioner to remove it." },
          { status: 403 }
        );
      }
      if (!verifyCode(code, entry.editCodeHash)) {
        return NextResponse.json({ error: "Incorrect personal code." }, { status: 403 });
      }
    }

    const settings = await prisma.contestSettings.findUnique({ where: { id: "main" } });
    if (!isCommissioner && isContestLocked(settings)) {
      return NextResponse.json(
        { error: "The contest is locked. Entries can no longer be removed." },
        { status: 403 }
      );
    }

    await prisma.entry.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/entries/[id] DELETE] Error:", err);
    return NextResponse.json({ error: "Failed to delete entry." }, { status: 500 });
  }
}
