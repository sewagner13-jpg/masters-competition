/**
 * Import player salaries from an xlsx spreadsheet into the database.
 *
 * Usage:
 *   npx tsx scripts/import-salaries.ts path/to/2026_masters_salary_list.xlsx
 *
 * Expected spreadsheet columns (case-insensitive, flexible):
 *   - Name / Player / Golfer
 *   - Salary / Sal / Amount
 *
 * If the spreadsheet uses different column names, update the column
 * detection logic in detectColumns() below.
 */

import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import type { PlayerPoolEntry } from "../lib/playerPool";
import { replacePlayerPool } from "../lib/playerPoolSync";

const prisma = new PrismaClient();

interface RawRow {
  [key: string]: string | number | undefined;
}

function detectColumns(headers: string[]): {
  nameCol: string;
  salaryCol: string;
} {
  const normalized = headers.map((h) => ({
    original: h,
    lower: String(h).toLowerCase().trim(),
  }));

  const nameCol = normalized.find((h) =>
    ["name", "player", "golfer", "athlete"].includes(h.lower)
  )?.original;

  const salaryCol = normalized.find((h) =>
    ["salary", "sal", "amount", "cost", "price"].includes(h.lower)
  )?.original;

  if (!nameCol || !salaryCol) {
    console.error("Headers found:", headers);
    throw new Error(
      `Could not detect name/salary columns. ` +
        `Expected columns named "Name" and "Salary" (case-insensitive). ` +
        `Found: ${headers.join(", ")}`
    );
  }

  return { nameCol, salaryCol };
}

function parseSalary(raw: string | number | undefined): number {
  if (typeof raw === "number") return Math.round(raw);
  if (!raw) return 0;
  // Strip $, commas, spaces
  const cleaned = String(raw).replace(/[$,\s]/g, "");
  const parsed = parseInt(cleaned, 10);
  if (isNaN(parsed)) throw new Error(`Cannot parse salary: "${raw}"`);
  return parsed;
}

async function importSalaries(filePath: string) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  console.log(`Reading: ${resolved}`);
  const workbook = XLSX.readFile(resolved);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  if (rows.length === 0) {
    throw new Error("Spreadsheet appears to be empty.");
  }

  const headers = Object.keys(rows[0]);
  const { nameCol, salaryCol } = detectColumns(headers);

  console.log(
    `Detected columns — Name: "${nameCol}", Salary: "${salaryCol}"`
  );
  console.log(`Found ${rows.length} rows.`);

  const importedPlayers: PlayerPoolEntry[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawName = row[nameCol];
    const rawSalary = row[salaryCol];

    if (!rawName) {
      skipped++;
      continue;
    }

    const name = String(rawName).trim();
    let salary: number;

    try {
      salary = parseSalary(rawSalary);
    } catch (err) {
      console.warn(`Row ${i + 2}: Skipping "${name}" — ${err}`);
      skipped++;
      continue;
    }

    if (salary <= 0) {
      console.warn(`Row ${i + 2}: Skipping "${name}" — salary is 0 or negative`);
      skipped++;
      continue;
    }

    console.log(`  [${i + 2}] ${name} — $${salary.toLocaleString()}`);
    importedPlayers.push({ name, salary });
  }

  if (importedPlayers.length === 0) {
    throw new Error("No valid player rows found in the spreadsheet.");
  }

  const { created, updated, deactivated } = await replacePlayerPool(prisma, importedPlayers, {
    sourceRowStart: 2,
  });

  console.log(
    `\nDone. Imported: ${importedPlayers.length}, Skipped: ${skipped}, Created: ${created}, Updated: ${updated}, Deactivated: ${deactivated}`
  );
}

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: npx tsx scripts/import-salaries.ts <path-to-xlsx>");
  process.exit(1);
}

importSalaries(filePath)
  .catch((err) => {
    console.error("Import failed:", err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
