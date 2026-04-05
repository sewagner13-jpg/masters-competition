/**
 * Seed the database with the 2026 Masters player pool.
 *
 * This uses a hardcoded list. If you have the actual spreadsheet,
 * run the import script instead:
 *   npx tsx scripts/import-salaries.ts path/to/2026_masters_salary_list.xlsx
 *
 * Run this seed:
 *   npx tsx prisma/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 2026 Masters player pool with salary values
// Replace these with your actual spreadsheet data.
// Salaries are on the $5,000–$12,000 scale summing to a 50,000 cap for 6 picks.
const PLAYERS = [
  // Tier 1 — Elite ($11,000–$12,000)
  { name: "Scottie Scheffler", salary: 12000 },
  { name: "Rory McIlroy", salary: 11500 },
  { name: "Xander Schauffele", salary: 11000 },

  // Tier 2 — Top contenders ($9,500–$10,500)
  { name: "Jon Rahm", salary: 10500 },
  { name: "Collin Morikawa", salary: 10000 },
  { name: "Viktor Hovland", salary: 10000 },
  { name: "Brooks Koepka", salary: 9500 },
  { name: "Patrick Cantlay", salary: 9500 },

  // Tier 3 — Strong players ($8,000–$9,000)
  { name: "Ludvig Åberg", salary: 9000 },
  { name: "Tommy Fleetwood", salary: 8800 },
  { name: "Shane Lowry", salary: 8500 },
  { name: "Justin Thomas", salary: 8500 },
  { name: "Tony Finau", salary: 8000 },
  { name: "Dustin Johnson", salary: 8000 },
  { name: "Adam Scott", salary: 8000 },

  // Tier 4 — Mid-range ($6,500–$7,500)
  { name: "Hideki Matsuyama", salary: 7500 },
  { name: "Will Zalatoris", salary: 7500 },
  { name: "Cameron Smith", salary: 7500 },
  { name: "Min Woo Lee", salary: 7500 },
  { name: "Joaquin Niemann", salary: 7000 },
  { name: "Sahith Theegala", salary: 7000 },
  { name: "Russell Henley", salary: 7000 },
  { name: "Keegan Bradley", salary: 6800 },
  { name: "Harris English", salary: 6500 },
  { name: "Si Woo Kim", salary: 6500 },

  // Tier 5 — Value plays ($5,000–$6,000)
  { name: "Sepp Straka", salary: 6000 },
  { name: "Ryan Fox", salary: 6000 },
  { name: "Taylor Moore", salary: 5800 },
  { name: "Davis Thompson", salary: 5800 },
  { name: "Akshay Bhatia", salary: 5500 },
  { name: "Nick Dunlap", salary: 5500 },
  { name: "Austin Eckroat", salary: 5500 },
  { name: "Jacob Bridgeman", salary: 5200 },
  { name: "Luke Clanton", salary: 5200 },
  { name: "Jose Luis Ballester", salary: 5000 },
  { name: "Christo Lamprecht", salary: 5000 },
  { name: "Gordon Sargent", salary: 5000 },
];

async function seed() {
  console.log("Seeding player pool...");

  let created = 0;
  let updated = 0;

  for (let i = 0; i < PLAYERS.length; i++) {
    const { name, salary } = PLAYERS[i];

    const existing = await prisma.player.findFirst({ where: { name } });

    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { salary, isActive: true, sourceRow: i + 1 },
      });
      updated++;
    } else {
      await prisma.player.create({
        data: { name, salary, isActive: true, sourceRow: i + 1 },
      });
      created++;
    }

    console.log(`  ${name} — $${salary.toLocaleString()}`);
  }

  console.log(`\nSeed complete. Created: ${created}, Updated: ${updated}`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
