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
    const runs = await prisma.syncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ runs });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load sync runs" }, { status: 500 });
  }
}
