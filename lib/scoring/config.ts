/**
 * Scoring configuration — the single place to update scoring rules.
 *
 * This is intentionally simple so it can be swapped out once the
 * final game rules are decided. The scoring engine reads this config
 * and never hard-codes values.
 */

export interface ScoringConfig {
  // Points awarded per stroke under par (negative totalToPar = under par)
  pointsPerBirdieOrBetter: number;
  // Points per stroke over par
  pointsPerBogeyOrWorse: number;
  // Bonus for finishing position (key = position string like "1", "T2")
  positionBonuses: Record<string, number>;
  // Penalty if player misses cut
  missedCutPenalty: number;
  // Whether lower score = better (like actual golf)
  lowerIsBetter: boolean;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  // Placeholder rules — replace these once final game format is decided
  pointsPerBirdieOrBetter: 0, // Currently not used — scoring from totalToPar
  pointsPerBogeyOrWorse: 0,
  positionBonuses: {},
  missedCutPenalty: 0,
  lowerIsBetter: true,
};

/**
 * Convert a player's totalToPar into a fantasy score.
 * Currently: score = totalToPar (lower is better, like real golf).
 * Replace this function body to implement custom scoring.
 */
export function computePlayerScore(
  totalToPar: number | null | undefined,
  position: string | null | undefined,
  _config: ScoringConfig = DEFAULT_SCORING_CONFIG
): number {
  if (totalToPar === null || totalToPar === undefined) return 0;
  // Placeholder: just use totalToPar directly
  return totalToPar;
}
