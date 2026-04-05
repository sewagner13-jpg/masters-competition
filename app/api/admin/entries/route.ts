import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  return secret === process.env.ADMIN_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
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
