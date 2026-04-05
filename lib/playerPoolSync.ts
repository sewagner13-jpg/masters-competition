import type { PrismaClient } from "@prisma/client";
import type { PlayerPoolEntry } from "./playerPool";

interface ReplacePlayerPoolOptions {
  sourceRowStart?: number;
}

export interface ReplacePlayerPoolResult {
  created: number;
  updated: number;
  deactivated: number;
}

function findDuplicateNames(players: readonly PlayerPoolEntry[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const player of players) {
    if (seen.has(player.name)) {
      duplicates.add(player.name);
      continue;
    }

    seen.add(player.name);
  }

  return [...duplicates];
}

export async function replacePlayerPool(
  prisma: PrismaClient,
  players: readonly PlayerPoolEntry[],
  options: ReplacePlayerPoolOptions = {}
): Promise<ReplacePlayerPoolResult> {
  const duplicateNames = findDuplicateNames(players);

  if (duplicateNames.length > 0) {
    throw new Error(`Duplicate player names found: ${duplicateNames.join(", ")}`);
  }

  const sourceRowStart = options.sourceRowStart ?? 1;
  const playerNames = players.map((player) => player.name);
  const playerNameSet = new Set(playerNames);

  return prisma.$transaction(async (tx) => {
    const existingPlayers = await tx.player.findMany({
      select: { id: true, name: true, isActive: true, createdAt: true },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    });

    const idsToDeactivate = new Set<string>();
    const existingIdsByName = new Map<string, string[]>();

    for (const player of existingPlayers) {
      const existingIds = existingIdsByName.get(player.name) ?? [];
      existingIds.push(player.id);
      existingIdsByName.set(player.name, existingIds);

      if (!playerNameSet.has(player.name) && player.isActive) {
        idsToDeactivate.add(player.id);
      }
    }

    let created = 0;
    let updated = 0;

    for (const [index, player] of players.entries()) {
      const existingIds = existingIdsByName.get(player.name) ?? [];
      const [primaryId, ...duplicateIds] = existingIds;

      if (primaryId) {
        await tx.player.update({
          where: { id: primaryId },
          data: {
            salary: player.salary,
            isActive: true,
            sourceRow: sourceRowStart + index,
          },
        });
        updated++;

        for (const duplicateId of duplicateIds) {
          idsToDeactivate.add(duplicateId);
        }
      } else {
        await tx.player.create({
          data: {
            name: player.name,
            salary: player.salary,
            isActive: true,
            sourceRow: sourceRowStart + index,
          },
        });
        created++;
      }
    }

    let deactivated = 0;

    if (idsToDeactivate.size > 0) {
      const result = await tx.player.updateMany({
        where: { id: { in: [...idsToDeactivate] }, isActive: true },
        data: { isActive: false },
      });
      deactivated = result.count;
    }

    return { created, updated, deactivated };
  });
}
