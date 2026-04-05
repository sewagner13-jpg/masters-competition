import { NextRequest, NextResponse } from "next/server";
import { runStatSync } from "@/lib/stats/sync";
import { isAdminAuthorized } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isAdminAuthorized(req)) {
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
