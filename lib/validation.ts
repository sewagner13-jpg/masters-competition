import { z } from "zod";
import { SALARY_CAP, ROSTER_SIZE } from "./constants";

export const submitEntrySchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1, "Entry name is required")
    .max(100, "Entry name must be 100 characters or fewer"),
  playerIds: z
    .array(z.string())
    .length(ROSTER_SIZE, `You must select exactly ${ROSTER_SIZE} players`)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate players are not allowed"
    ),
  editCode: z
    .string()
    .trim()
    .min(4, "Personal code must be at least 4 characters")
    .max(50, "Personal code must be 50 characters or fewer")
    .optional()
    .or(z.literal("")),
  publicMessage: z
    .string()
    .trim()
    .max(200, "Public message must be 200 characters or fewer")
    .optional()
    .or(z.literal("")),
});

export type SubmitEntryInput = z.infer<typeof submitEntrySchema>;

export const editEntrySchema = z.object({
  code: z
    .string()
    .trim()
    .max(50, "Code must be 50 characters or fewer")
    .optional()
    .or(z.literal("")),
  userName: z
    .string()
    .trim()
    .min(1, "Entry name is required")
    .max(100)
    .optional(),
  playerIds: z
    .array(z.string())
    .length(ROSTER_SIZE, `You must select exactly ${ROSTER_SIZE} players`)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate players not allowed")
    .optional(),
  publicMessage: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("")),
});

export type EditEntryInput = z.infer<typeof editEntrySchema>;

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
