import { APP_NAME, ROSTER_SIZE, SALARY_CAP } from "./constants";
import { HOLE_POINTS } from "./scoring/config";

export interface ContentSection {
  title: string;
  copy?: string;
  bullets?: string[];
}

export interface ScoringRow {
  result: string;
  points: number;
}

const SALARY_CAP_LABEL = `$${SALARY_CAP.toLocaleString()}`;

export const ENTRY_DEADLINE_LABEL = "7:45 AM EDT on Thursday, April 9, 2026";
export const ENTRY_DEADLINE_SHORT = "Thu Apr 9 at 7:45 AM EDT";

export const QUICK_RULE_CALLOUTS = [
  { label: "Lineup", value: `${ROSTER_SIZE} golfers` },
  { label: "Salary Cap", value: SALARY_CAP_LABEL },
  { label: "Lock Time", value: ENTRY_DEADLINE_SHORT },
];

export const HOME_SUMMARY_CARDS = [
  {
    title: "Build Lineup",
    href: "/play",
    description: `Choose ${ROSTER_SIZE} golfers from the full Masters field and stay at or under ${SALARY_CAP_LABEL}.`,
  },
  {
    title: "View Leaderboard",
    href: "/leaderboard",
    description: "Track each round, see who is climbing, and follow the overall race all weekend.",
  },
  {
    title: "Read Rules",
    href: "/rules",
    description: "Get the format, prizes, Sunday bonus, and tie rule in plain English before you lock in a team.",
  },
];

export const RULES_INTRO =
  `${APP_NAME} is meant to be simple, competitive, and easy to jump into. ` +
  "Here is the full format without the legalese.";

export const RULES_SECTIONS: ContentSection[] = [
  {
    title: "How It Works",
    bullets: [
      "Pick 6 golfers from the full Masters player pool.",
      `Stay at or under the ${SALARY_CAP_LABEL} salary cap.`,
      "One entry per person.",
      `Entries lock at ${ENTRY_DEADLINE_LABEL}.`,
      "Daily winners are based only on that round's Masters points.",
      "Overall winner is based on all 4 Masters rounds plus the Sunday bonus.",
    ],
  },
  {
    title: "Entry Deadline",
    copy:
      "Entries and lineup edits are allowed until 7:45 AM EDT on Thursday, April 9, 2026. " +
      "After that, lineups lock unless the commissioner unlocks them with the master code.",
  },
  {
    title: "Lineup Rules",
    bullets: [
      "Exactly 6 golfers are required.",
      `Total salary must be ${SALARY_CAP_LABEL} or less.`,
      "No duplicate golfers in the same lineup.",
      "Duplicate lineups across different entries are allowed.",
      "Users may edit their lineup before lock.",
      "An optional personal edit code can be added for protection.",
    ],
  },
  {
    title: "Daily Winners",
    copy:
      "There are 4 daily prizes. Thursday, Friday, Saturday, and Sunday daily winners are based only on that day's Masters points. " +
      "Sunday bonus points do not affect the Sunday daily prize.",
  },
  {
    title: "Overall Winner",
    copy:
      "The overall standings are based on all 4 Masters rounds combined, plus the Sunday team bonus.",
  },
  {
    title: "Prizes",
    bullets: [
      "Daily prizes: 1st and 2nd each day.",
      "Overall prizes: 1st, 2nd, and 3rd.",
      "Small prize for last place.",
      "Buy-in is 50 dollars per entry.",
    ],
  },
  {
    title: "Tie Rule",
    copy:
      "There are no tiebreakers. If there is a tie, the combined prize money for the tied places is split evenly.",
  },
];

export const SUNDAY_BONUS_SHORT =
  "The Sunday bonus is the extra twist in the game. After the Masters Sunday round is scored, each entry also gets points from its assigned Sunday golf team. " +
  "Those points are based on the team's score versus par on each hole and are added only to the final overall standings. " +
  "The Sunday bonus does not affect the Sunday daily Masters winner.";

export const SUNDAY_BONUS_EXPANDED =
  "Each entry has a Sunday representative and an assigned Sunday team. During your Sunday golf round, that team earns fantasy points based on its score versus par on each hole. " +
  "Those points are then added to the entry's overall contest total. This bonus only affects the final overall standings and does not change any daily Masters prize results.";

export const SUNDAY_BONUS_RULES = [
  "The Sunday bonus counts only toward the final overall standings.",
  "It does not affect the Thursday, Friday, Saturday, or Sunday daily Masters prizes.",
  "Each entry is linked to one Sunday representative.",
  "Each entry is also assigned a Sunday team by the commissioner.",
  "Sunday bonus points come from that team's score versus par on each hole.",
  "The same Sunday team hole result is applied to every entry assigned to that team.",
  "All 18 holes count.",
  "Sunday bonus is added at full value to the overall total.",
];

export const SCORING_PAGE_INTRO =
  "Fantasy points are meant to be easy to follow: daily prizes come from Masters round scoring only, while the final overall race adds the Sunday bonus on top.";

export const MASTERS_SCORING_COPY =
  "Masters scoring is hole by hole. Each golfer earns fantasy points based on the result of every hole, and a round total is the sum of all 18 holes. " +
  "Daily winners use only that round's Masters points.";

export const SUNDAY_SCORING_COPY =
  "The Sunday bonus uses the same hole values, but it is applied to each entry through its assigned Sunday team. " +
  "Those points count toward overall only, never toward the daily Masters prizes.";

export const SCORING_ROWS: ScoringRow[] = [
  { result: "Double Eagle", points: HOLE_POINTS.double_eagle },
  { result: "Hole in One", points: HOLE_POINTS.hole_in_one },
  { result: "Eagle", points: HOLE_POINTS.eagle },
  { result: "Birdie", points: HOLE_POINTS.birdie },
  { result: "Par", points: HOLE_POINTS.par },
  { result: "Bogey", points: HOLE_POINTS.bogey },
  { result: "Double Bogey or Worse", points: HOLE_POINTS.double_bogey_or_worse },
];

export const WORKED_EXAMPLE = {
  masters: {
    title: "Masters Round Example",
    copy:
      "If one golfer goes birdie, par, bogey, and eagle across four holes, those holes are worth +3, +0.5, -0.5, and +8. " +
      "That is +11.0 fantasy points before the rest of the round is added in.",
    rows: [
      { result: "Birdie", points: HOLE_POINTS.birdie },
      { result: "Par", points: HOLE_POINTS.par },
      { result: "Bogey", points: HOLE_POINTS.bogey },
      { result: "Eagle", points: HOLE_POINTS.eagle },
    ],
    total: HOLE_POINTS.birdie + HOLE_POINTS.par + HOLE_POINTS.bogey + HOLE_POINTS.eagle,
  },
  sunday: {
    title: "Sunday Bonus Example",
    copy:
      "If your entry is assigned to Sean's Sunday team, your entry gets that team's hole-by-hole Sunday fantasy points. " +
      "If the team makes birdie on one hole and par on the next, your entry gets +3 and then +0.5. " +
      "Those Sunday points are added only to your final overall score.",
  },
};
