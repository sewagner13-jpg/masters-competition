/**
 * Edit code helpers — hash and verify personal entry codes.
 * Uses SHA-256 (no bcrypt dependency needed, codes are user-chosen PINs not passwords).
 */

import { createHash } from "crypto";

export function hashCode(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

export function verifyCode(code: string, hash: string): boolean {
  return hashCode(code) === hash;
}
