import { NextRequest, NextResponse } from "next/server";
import { runStatSync } from "@/lib/stats/sync";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  return secret === process.env.ADMIN_SECRET;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runStatSync({ forceSync: true });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/admin/sync] Error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
