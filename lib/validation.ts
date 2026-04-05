import { z } from "zod";
import { SALARY_CAP, ROSTER_SIZE } from "./constants";

export const submitEntrySchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  playerIds: z
    .array(z.string().cuid())
    .length(ROSTER_SIZE, `You must select exactly ${ROSTER_SIZE} players`)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate players are not allowed"
    ),
});

export type SubmitEntryInput = z.infer<typeof submitEntrySchema>;

export function validateSalaryCap(
  players: { salary: number }[]
): { valid: boolean; total: number; remaining: number } {
  const total = players.reduce((sum, p) => sum + p.salary, 0);
  return {
    valid: total <= SALARY_CAP,
    total,
    remaining: SALARY_CAP - total,
  };
}
