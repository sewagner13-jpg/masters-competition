/**
 * Seed the database with the 2026 Masters player pool.
 *
 * Source of truth:
 *   lib/playerPool.ts
 *
 * Run this seed:
 *   npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";
import { PLAYER_POOL } from "../lib/playerPool";
import { replacePlayerPool } from "../lib/playerPoolSync";

const prisma = new PrismaClient();

async function seed() {
  console.log(`Replacing player pool from lib/playerPool.ts (${PLAYER_POOL.length} players)...`);

  for (const player of PLAYER_POOL) {
    console.log(`  ${player.name} — $${player.salary.toLocaleString()}`);
  }

  const { created, updated, deactivated } = await replacePlayerPool(prisma, PLAYER_POOL, {
    sourceRowStart: 1,
  });

  console.log(`\nSeed complete. Created: ${created}, Updated: ${updated}, Deactivated: ${deactivated}`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
