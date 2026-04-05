# Handoff Document — Sunday Church Masters Competition

**Last updated**: 2026-04-05
**Status**: Phase 1 complete — full working app foundation built

## What Is Working

- ✅ Next.js 15 app scaffolded with TypeScript, Tailwind CSS, App Router
- ✅ Prisma schema: Player, Entry, EntryPlayer, PlayerStat, SyncRun
- ✅ Seed script (`prisma/seed.ts`) with 36-player 2026 Masters pool
- ✅ Spreadsheet import script (`scripts/import-salaries.ts`) — accepts xlsx
- ✅ `/play` — Full lineup builder with:
  - Player pool loaded from DB
  - Real-time salary cap tracker ($50,000)
  - 6-player roster selection with duplicate prevention
  - Search/filter players by name
  - Sticky sidebar on desktop
  - Submit button disabled until lineup is valid
- ✅ `POST /api/entries` — server-side validation, cap enforcement, DB persistence
- ✅ `/leaderboard` — public scoreboard with auto-refresh every 60 seconds
- ✅ `/admin` — password-protected panel with manual sync, sync run history, entry viewer
- ✅ Stats provider abstraction (`lib/stats/provider.ts`) — MockStatsProvider by default
- ✅ Scoring engine (`lib/scoring/engine.ts`) — decoupled from UI, config-driven
- ✅ Sync service (`lib/stats/sync.ts`) — logs every run to DB, ET window guard
- ✅ Netlify scheduled function (`netlify/functions/sync-stats.mts`) — every 15 min
- ✅ `netlify.toml` with `@netlify/plugin-nextjs`
- ✅ `.env.example` with all required variables documented

## What Is Incomplete

- ❌ **Real stats provider** — currently uses mock (returns empty data)
- ❌ **Final scoring rules** — placeholder is `totalToPar` directly; custom rules TBD
- ❌ **Spreadsheet file** — `/mnt/data/2026_masters_salary_list.xlsx` not present locally; seed uses hardcoded players
- ❌ **Netlify `@netlify/functions` package** — may need `npm install @netlify/functions` for TypeScript types in scheduled function

## Next Exact Steps (Priority Order)

1. **Set up PostgreSQL database** (local or Neon/Supabase)
   ```bash
   cp .env.example .env.local
   # set DATABASE_URL
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

2. **Run the app locally**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

3. **Import real salary spreadsheet** (when available)
   ```bash
   npm run import:salaries path/to/2026_masters_salary_list.xlsx
   ```

4. **Build a real stats provider** — see `docs/stats-provider-plan.md`
   - Create `lib/stats/providers/espn-provider.ts` (or similar)
   - Implement `StatsProvider` interface
   - Set `MASTERS_STATS_PROVIDER=espn` in env

5. **Finalize scoring rules** — edit `lib/scoring/config.ts`
   - Update `computePlayerScore()` with actual game format
   - Trigger manual sync from `/admin` to recompute scores

6. **Deploy to Netlify** — see `docs/netlify-deploy.md`

## Commands to Run Locally

```bash
# Install deps
npm install

# DB setup
npm run db:generate
npm run db:push
npm run db:seed

# Import spreadsheet (optional)
npm run import:salaries /path/to/spreadsheet.xlsx

# Dev server
npm run dev

# Build (test before deploy)
npm run build
```

## Database Migration Status

- Schema created: Yes (`prisma/schema.prisma`)
- Migrations run: **No** — only `db:push` used (schema-first, dev-only)
- For production, consider switching to `prisma migrate dev` and committing migrations

## Spreadsheet Usage

- **Import script**: `scripts/import-salaries.ts` — run with `npm run import:salaries <path>`
- **Seed script**: `prisma/seed.ts` — hardcoded 36-player pool as fallback
- **Column detection**: Flexible — looks for Name/Player/Golfer and Salary/Sal/Amount columns
- **Upsert logic**: Matches by player name; safe to re-run

## Files Safe to Edit Next

| File | What to change |
|---|---|
| `lib/scoring/config.ts` | Custom scoring rules |
| `lib/stats/provider.ts` | Add real provider case to switch |
| `lib/stats/providers/` | Create new provider implementations here |
| `prisma/seed.ts` | Update player list / salaries |
| `app/page.tsx` | Landing page copy |
| `tailwind.config.ts` | Color scheme tweaks |

## Known Issues

1. **Netlify scheduled function types**: May need `npm install -D @netlify/functions` for TypeScript types
2. **ESM imports in scheduled function**: The function imports from `../../lib/stats/sync.js` — Netlify esbuild handles this but may need `.js` extension adjustments
3. **Admin page headers in useCallback**: The `headers` object inside `useCallback` creates a lint warning; works correctly at runtime
4. **No rate limiting on entry submission**: A user can submit multiple lineups. If you want to prevent this, add IP-based or name-based deduplication in `POST /api/entries`

## Architecture Summary

- `app/` — Next.js pages and API routes
- `lib/` — All business logic (scoring, sync, validation, constants)
- `components/` — Client UI components
- `netlify/functions/` — Scheduled sync function
- `prisma/` — Schema and seed
- `scripts/` — One-time tools (import)
- `docs/` — This folder
