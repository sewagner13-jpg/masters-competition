import { BUY_IN } from "@/lib/constants";

export interface PrizeMoneyEntry {
  entryId: string;
  userName: string;
  scoreR1: number;
  scoreR2: number;
  scoreR3: number;
  scoreR4: number;
  scoreOverall: number;
}

export interface PrizeMoneyRow {
  entryId: string;
  userName: string;
  wonSoFar: number;
  liveToday: number;
  overallRace: number;
  totalLive: number;
}

export interface PrizeMoneySummary {
  pot: number;
  liveTodayRound: 1 | 2 | 3 | 4 | null;
  completedRounds: Array<1 | 2 | 3 | 4>;
  rows: PrizeMoneyRow[];
}

const EPSILON = 1e-9;
export const DAILY_PAYOUT_PCTS = [0.075, 0.025] as const;
export const OVERALL_PAYOUT_PCTS = [0.30, 0.15, 0.10] as const;
export const LAST_PLACE_PCT = 0.05;
export const PAYOUT_STRUCTURE = [
  { label: "Thu — 1st place", pct: DAILY_PAYOUT_PCTS[0], bucket: "Daily (×4)" },
  { label: "Thu — 2nd place", pct: DAILY_PAYOUT_PCTS[1], bucket: "Daily (×4)" },
  { label: "Fri — 1st place", pct: DAILY_PAYOUT_PCTS[0], bucket: "Daily (×4)" },
  { label: "Fri — 2nd place", pct: DAILY_PAYOUT_PCTS[1], bucket: "Daily (×4)" },
  { label: "Sat — 1st place", pct: DAILY_PAYOUT_PCTS[0], bucket: "Daily (×4)" },
  { label: "Sat — 2nd place", pct: DAILY_PAYOUT_PCTS[1], bucket: "Daily (×4)" },
  { label: "Sun — 1st place", pct: DAILY_PAYOUT_PCTS[0], bucket: "Daily (×4)" },
  { label: "Sun — 2nd place", pct: DAILY_PAYOUT_PCTS[1], bucket: "Daily (×4)" },
  { label: "Overall — 1st", pct: OVERALL_PAYOUT_PCTS[0], bucket: "Overall" },
  { label: "Overall — 2nd", pct: OVERALL_PAYOUT_PCTS[1], bucket: "Overall" },
  { label: "Overall — 3rd", pct: OVERALL_PAYOUT_PCTS[2], bucket: "Overall" },
  { label: "Last place", pct: LAST_PLACE_PCT, bucket: "Overall" },
] as const;

const ROUND_SCORE_KEY: Record<1 | 2 | 3 | 4, keyof PrizeMoneyEntry> = {
  1: "scoreR1",
  2: "scoreR2",
  3: "scoreR3",
  4: "scoreR4",
};

function roundScore(entry: PrizeMoneyEntry, round: 1 | 2 | 3 | 4) {
  return entry[ROUND_SCORE_KEY[round]] as number;
}

function zeroMap(entries: PrizeMoneyEntry[]) {
  return new Map(entries.map((entry) => [entry.entryId, 0]));
}

function addInto(target: Map<string, number>, source: Map<string, number>) {
  for (const [entryId, amount] of source.entries()) {
    target.set(entryId, (target.get(entryId) ?? 0) + amount);
  }
}

function buildRankedPayoutMap(
  entries: PrizeMoneyEntry[],
  scoreOf: (entry: PrizeMoneyEntry) => number,
  payouts: number[],
  direction: "desc" | "asc"
) {
  const payoutMap = zeroMap(entries);

  if (entries.length === 0 || payouts.every((amount) => Math.abs(amount) < EPSILON)) {
    return payoutMap;
  }

  const ranked = [...entries].sort((a, b) => {
    const diff = scoreOf(a) - scoreOf(b);
    if (Math.abs(diff) > EPSILON) {
      return direction === "desc" ? -diff : diff;
    }
    return a.userName.localeCompare(b.userName);
  });

  let index = 0;
  while (index < ranked.length) {
    const score = scoreOf(ranked[index]);
    let end = index + 1;

    while (end < ranked.length && Math.abs(scoreOf(ranked[end]) - score) < EPSILON) {
      end += 1;
    }

    const pooled = Array.from({ length: end - index }, (_, offset) => payouts[index + offset] ?? 0)
      .reduce((sum, amount) => sum + amount, 0);
    const each = pooled / (end - index);

    for (let cursor = index; cursor < end; cursor += 1) {
      payoutMap.set(ranked[cursor].entryId, each);
    }

    index = end;
  }

  return payoutMap;
}

export function getDailyPayoutMap(entries: PrizeMoneyEntry[], round: 1 | 2 | 3 | 4 | null) {
  if (!round) return zeroMap(entries);
  const pot = entries.length * BUY_IN;
  const payouts = DAILY_PAYOUT_PCTS.map((pct) => pot * pct);
  return buildRankedPayoutMap(entries, (entry) => roundScore(entry, round), payouts, "desc");
}

export function getPrizeMoneySummary(
  entries: PrizeMoneyEntry[],
  activeRound: 1 | 2 | 3 | 4 | null
): PrizeMoneySummary {
  const pot = entries.length * BUY_IN;
  const wonSoFar = zeroMap(entries);
  const liveToday = zeroMap(entries);
  const overallRace = zeroMap(entries);
  const totalLive = zeroMap(entries);

  const roundsWithAction = ([1, 2, 3, 4] as const).filter((round) =>
    entries.some((entry) => Math.abs(roundScore(entry, round)) > EPSILON)
  );

  const liveTodayRound =
    activeRound && roundsWithAction.includes(activeRound) ? activeRound : null;
  const completedRounds = roundsWithAction.filter(
    (round) => liveTodayRound === null || round < liveTodayRound
  );

  for (const round of completedRounds) {
    addInto(wonSoFar, getDailyPayoutMap(entries, round));
  }

  if (liveTodayRound) {
    addInto(liveToday, getDailyPayoutMap(entries, liveTodayRound));
  }

  if (roundsWithAction.length > 0) {
    addInto(
      overallRace,
      buildRankedPayoutMap(
        entries,
        (entry) => entry.scoreOverall,
        OVERALL_PAYOUT_PCTS.map((pct) => pot * pct),
        "desc"
      )
    );
    addInto(
      overallRace,
      buildRankedPayoutMap(
        entries,
        (entry) => entry.scoreOverall,
        [pot * LAST_PLACE_PCT],
        "asc"
      )
    );
  }

  addInto(totalLive, wonSoFar);
  addInto(totalLive, liveToday);
  addInto(totalLive, overallRace);

  const rows = entries
    .map((entry) => ({
      entryId: entry.entryId,
      userName: entry.userName,
      wonSoFar: wonSoFar.get(entry.entryId) ?? 0,
      liveToday: liveToday.get(entry.entryId) ?? 0,
      overallRace: overallRace.get(entry.entryId) ?? 0,
      totalLive: totalLive.get(entry.entryId) ?? 0,
    }))
    .sort((a, b) => {
      if (Math.abs(b.totalLive - a.totalLive) > EPSILON) return b.totalLive - a.totalLive;
      if (Math.abs(b.wonSoFar - a.wonSoFar) > EPSILON) return b.wonSoFar - a.wonSoFar;
      if (Math.abs(b.overallRace - a.overallRace) > EPSILON) return b.overallRace - a.overallRace;
      return a.userName.localeCompare(b.userName);
    });

  return {
    pot,
    liveTodayRound,
    completedRounds,
    rows,
  };
}
