import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const entries = await prisma.entry.findMany({
      orderBy: { submittedAt: "desc" },
      include: {
        players: {
          include: { player: { select: { name: true, salary: true } } },
        },
      },
    });

    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[api/admin/entries] Error:", err);
    return NextResponse.json({ error: "Failed to load entries" }, { status: 500 });
  }
}
