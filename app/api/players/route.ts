import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const players = await prisma.player.findMany({
      where: { isActive: true },
      orderBy: { salary: "desc" },
      select: { id: true, name: true, salary: true, isActive: true },
    });

    return NextResponse.json({ players });
  } catch (err) {
    console.error("[api/players] Error:", err);
    return NextResponse.json(
      { error: "Failed to load players" },
      { status: 500 }
    );
  }
}
