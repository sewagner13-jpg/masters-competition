import type { NextRequest } from "next/server";
import { COMMISSIONER_CODE } from "@/lib/constants";

export const MASTER_CODE_HEADER = "x-master-code";

export function isAdminAuthorized(req: NextRequest): boolean {
  const providedCode =
    req.headers.get(MASTER_CODE_HEADER)?.trim() ??
    req.headers.get("x-admin-secret")?.trim() ??
    "";

  return providedCode.length > 0 && providedCode === COMMISSIONER_CODE;
}
