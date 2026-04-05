# Handoff Document — Sunday Church Masters Competition

**Last updated**: 2026-04-05
**Status**: Phase 2 complete — all contest rules, locking, scoring, commissioner controls, and entry editing implemented

---

## What Is Working

### Phase 1 (foundation)
- ✅ Next.js 16 + TypeScript + Tailwind + Prisma + Neon PostgreSQL
- ✅ Player pool (37 players seeded, spreadsheet import script ready)
- ✅ `/play` — lineup builder with $50k salary cap, 6-player validation
- ✅ Netlify deployment at https://masters-competition-sw.netlify.app

### Phase 2 (contest rules — just completed)
- ✅ **One entry per person** — `userName` is `@unique`, duplicate name returns 409
- ✅ **Contest lock** — auto-locks Thu Apr 9 @ 7:45 AM ET; commissioner can force-lock or force-unlock via admin panel
- ✅ **Personal edit code** — optional at submission, SHA-256 hashed in DB, encouraged in UI
- ✅ **Public message** — optional, shown to everyone on leaderboard after lock
- ✅ **Lineup visibility** — hidden before lock, full detail visible after lock
- ✅ **Entry edit page** (`/edit/[id]`) — users enter personal code to edit before lock; locked after deadline
- ✅ **Commissioner override** — master code `1110` bypasses lock and code checks at any time
- ✅ **Scoring engine** — 5 buckets: R1/R2/R3/R4 (daily) + overall (R1+R2+R3+R4+SundayBonus)
- ✅ **Real hole scoring config** — double eagle=20, eagle=8, birdie=3, par=0.5, bogey=-1, double bogey=-2, worse than double bogey=-5
- ✅ **Sunday team scores** — commissioner enters hole-by-hole scores per team; bonus applies to overall only
- ✅ **Sunday assignments** — commissioner assigns rep name + team name + isPlayingSunday per entry in admin panel
- ✅ **Leaderboard tabs** — Today's Round (default) and Overall; entry detail modal shows golfers/rep/team/message
- ✅ **Commissioner panel** (`/admin`) — lock controls, Sunday assignments, team score entry, sync runs, score table
- ✅ **Prize display** — not yet built (percentages agreed, no UI yet — see below)

---

## What Is Incomplete / Next Steps

### 1. Real stats provider (highest priority before tournament starts)
- Currently `MASTERS_STATS_PROVIDER=mock` → all scores show 0
- Need: implement a real provider in `lib/stats/providers/`
- Per-round fantasy points (`r1Pts`–`r4Pts`) on `PlayerStat` must be populated
- See `docs/stats-provider-plan.md`

### 2. Actual salary spreadsheet import
- Run when Sean provides the file:
  ```bash
  DATABASE_URL="..." npx tsx scripts/import-salaries.ts path/to/2026_masters_salary_list.xlsx
  ```

### 3. Prize display on leaderboard (optional before tournament)
Agreed prize structure (all based on $50 buy-in × N entries):
- Daily (4 days × 10% of pot): 1st = 7.5%, 2nd = 2.5%
- Overall: 1st = 30%, 2nd = 15%, 3rd = 10%
- Last place: 5%
- Ties: split combined prize money evenly, no tiebreakers

### 4. GitHub Actions auto-deploy
- Workflow file is at `.github/workflows/deploy.yml` locally but can't be pushed (token needs `workflow` scope)
- Fix: go to github.com/settings/tokens → add `workflow` scope → I can push the file, OR use Netlify UI to link GitHub repo directly

---

## Database Changes (Phase 2)

### Entry model additions
| Field | Type | Purpose |
|---|---|---|
| `userName` | `String @unique` | One entry per name |
| `updatedAt` | `DateTime` | Track edits |
| `editCodeHash` | `String?` | SHA-256 of personal code |
| `publicMessage` | `String?` | Shown after lock |
| `sundayRepName` | `String?` | Commissioner-assigned |
| `sundayTeamName` | `String?` | Commissioner-assigned |
| `isPlayingSunday` | `Boolean` | Flag for Sunday outing |
| `scoreR1–R4` | `Float` | Per-round fantasy pts |
| `sundayBonusPoints` | `Float` | From SundayTeam |
| `score` | `Float` | Overall (R1+R2+R3+R4+bonus) |

### New models
- **`ContestSettings`** — singleton `id="main"`, `isForceUnlocked`, `lockedAt`
- **`SundayTeam`** — `teamName @unique`, `bonusPoints`, `holeScores` (JSON)

### PlayerStat additions
- `r1Pts`, `r2Pts`, `r3Pts`, `r4Pts` — per-round fantasy points (null until stats provider populates)

---

## Screens Updated

| Page | What Changed |
|---|---|
| `/play` | "Entry Name" label, personal code field (encouraged), public message field, locked redirect |
| `/leaderboard` | Today/Overall tabs, pre-lock entry count (no lineups shown), entry detail modal, lock banner |
| `/edit/[id]` | **New** — code-auth edit page, locked redirect |
| `/admin` | Lock controls, Sunday assignment table, Sunday team score entry, all-entries score table |

---

## Commissioner Operations

### Locking
- Auto-locks at `2026-04-09T07:45:00-04:00`
- Manual force-lock: Admin → "Force Lock Now"
- Manual unlock: Admin → "Force Unlock"
- Master code for direct entry edits: `1110` (set as `COMMISSIONER_CODE` in env)

### Sunday assignments
1. Go to `/admin` → Sunday Assignments section
2. For each entry, fill in Representative name, Team name, check/uncheck Playing
3. Click Save per row

### Sunday team scores
1. Admin → Sunday Team Scores section
2. Enter team name + hole-by-hole scores (score to par: -1=birdie, 0=par, 1=bogey, 2=double bogey, 3+=worse than double bogey)
3. Click Save Team Scores → bonus points computed automatically

### Post-lock roster edit (commissioner)
1. Go to `/edit/[entryId]`
2. Enter master code `1110`
3. Edit freely — lock check is bypassed for commissioner

---

## Commands

```bash
# Local dev
npm run dev

# DB push (after schema change)
DATABASE_URL="..." npx prisma db push

# Import spreadsheet
npm run import:salaries path/to/spreadsheet.xlsx

# Deploy to Netlify
NETLIFY_AUTH_TOKEN=... netlify deploy --prod --site b6a271f5-4da6-48c5-9afc-d0cf2761fa78 --dir .next
```

## Environment Variables (all set in Netlify)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon `masters-competition` project |
| `MASTERS_STATS_PROVIDER` | `mock` (change when real provider ready) |
| `SYNC_ENABLED` | `true` |
| `SYNC_START_HOUR_ET` | `6` |
| `SYNC_END_HOUR_ET` | `21` |
| `ADMIN_SECRET` | Set in Netlify dashboard |
| `COMMISSIONER_CODE` | `1110` |
| `NEXT_PUBLIC_APP_URL` | `https://masters-competition-sw.netlify.app` |

## Files Safe to Edit Next

| File | What to change |
|---|---|
| `lib/scoring/config.ts` | Scoring rules already correct — only change if rules update |
| `lib/stats/provider.ts` | Add real provider switch |
| `lib/stats/providers/` | Create real provider implementation here |
| `prisma/seed.ts` | Will be replaced by spreadsheet import |
| `app/leaderboard/page.tsx` | Add prize display section when ready |
