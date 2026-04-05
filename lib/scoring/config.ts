/**
 * Scoring configuration — Sunday Church Masters Competition
 *
 * Same table used for Masters per-round scoring AND Sunday team bonus scoring.
 *
 * Points per hole result:
 *   Double eagle / Hole-in-one : 20
 *   Eagle                      : 8
 *   Birdie                     : 3
 *   Par                        : 0.5
 *   Bogey                      : -1
 *   Double bogey               : -2
 *   Worse than double bogey    : -5
 *
 * Daily score  = fantasy points from that round only (Thu/Fri/Sat/Sun)
 * Overall score = sum of all 4 rounds + Sunday team bonus
 */

export const HOLE_POINTS: Record<string, number> = {
  double_eagle: 20,
  hole_in_one: 20,
  eagle: 8,
  birdie: 3,
  par: 0.5,
  bogey: -1,
  double_bogey: -2,
  worse_than_double_bogey: -5,
};

/**
 * Convert a golfer's score relative to par on a single hole into fantasy points.
 * scoreToPar: negative = under par, 0 = par, positive = over par
 */
export function holeScoreToPoints(scoreToPar: number): number {
  if (scoreToPar <= -3) return HOLE_POINTS.double_eagle;   // double eagle or better
  if (scoreToPar === -2) return HOLE_POINTS.eagle;
  if (scoreToPar === -1) return HOLE_POINTS.birdie;
  if (scoreToPar === 0)  return HOLE_POINTS.par;
  if (scoreToPar === 1)  return HOLE_POINTS.bogey;
  if (scoreToPar === 2)  return HOLE_POINTS.double_bogey;
  return HOLE_POINTS.worse_than_double_bogey;              // +3 or worse
}

/**
 * When we only have a total-to-par for a full round (not hole-by-hole),
 * we can't apply the exact scoring table. This is a placeholder that
 * returns 0 until real hole-by-hole data is available from the provider.
 *
 * Replace this with real hole-by-hole aggregation once the stats provider
 * supplies hole results.
 */
export function roundTotalToFantasyPoints(
  _totalToPar: number | null | undefined
): number {
  // Placeholder until hole-by-hole stats are available.
  // Real implementation: sum holeScoreToPoints() for each of the 18 holes.
  return 0;
}
