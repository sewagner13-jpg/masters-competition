export const SALARY_CAP = 50_000;
export const ROSTER_SIZE = 6;
export const EVENT_NAME = "2026 Masters Tournament";
export const APP_NAME = "Sunday Church Masters Competition";
export const BUY_IN = 50;

// Contest lock deadline — Thursday April 9 2026, 7:45am ET
// After this time no new entries or edits (unless commissioner override)
export const LOCK_DEADLINE = new Date("2026-04-09T07:45:00-04:00");

// Commissioner master code is read from env server-side only
// Set COMMISSIONER_CODE in .env / Netlify env vars
// Default "1110" matches the agreed code — override in production env
export const COMMISSIONER_CODE = process.env.COMMISSIONER_CODE ?? "1110";
