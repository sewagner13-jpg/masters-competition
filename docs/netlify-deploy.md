# Netlify Deployment Guide

## Prerequisites

- Netlify account
- PostgreSQL database (recommend Neon, Supabase, or Railway for serverless-friendly connections)
- GitHub repo connected to Netlify

## Steps

### 1. Connect repo to Netlify

In Netlify dashboard:
- New site → Import from Git → select your repo
- Build command: `npm run build`
- Publish directory: `.next`

### 2. Install Next.js plugin

`netlify.toml` already includes `@netlify/plugin-nextjs`. Netlify will auto-install it.

If it doesn't, run in Netlify dashboard: Plugins → find and install "Essential Next.js".

### 3. Set environment variables

In Netlify: Site settings → Environment variables. Add all of these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your production Postgres connection string |
| `MASTERS_STATS_PROVIDER` | `mock` (until real provider is built) |
| `SYNC_ENABLED` | `true` |
| `SYNC_TIMEZONE` | `America/New_York` |
| `SYNC_START_HOUR_ET` | `6` |
| `SYNC_END_HOUR_ET` | `21` |
| `ADMIN_SECRET` | A strong secret (use a password manager) |
| `NEXT_PUBLIC_APP_URL` | Your Netlify site URL |

### 4. Database setup

After first deploy, run migrations via your CI or locally pointing at prod DB:

```bash
DATABASE_URL="your-prod-url" npx prisma db push
DATABASE_URL="your-prod-url" npx tsx prisma/seed.ts
```

Or if you have the spreadsheet:
```bash
DATABASE_URL="your-prod-url" npx tsx scripts/import-salaries.ts path/to/2026_masters_salary_list.xlsx
```

### 5. Deploy

Push to main branch or trigger manually in Netlify dashboard.

## Scheduled Sync Function

`netlify/functions/sync-stats.mts` runs on cron: `0,15,30,45 * * * *` (every 15 min, UTC).

The function contains a time-window guard that checks `SYNC_START_HOUR_ET`/`SYNC_END_HOUR_ET`
before doing any real work. Outside those hours it logs a "skipped" SyncRun and exits.

You can verify the function is working in:
- Netlify dashboard → Functions → sync-stats → logs
- Your app's `/admin` page → Recent Sync Runs

## Manual Sync (Admin)

From `/admin` page, click "Run Sync Now" to force a sync outside the scheduled window.
This calls `POST /api/admin/sync` with the `x-admin-secret` header.

## Troubleshooting

**Site deploys but DB fails**: Check `DATABASE_URL` env var. Ensure DB allows connections from Netlify IPs.

**Scheduled function not firing**: Check Netlify dashboard → Functions. Ensure the function appears and has a cron schedule shown.

**Sync runs show "failed"**: Check `/admin` sync run messages. Most likely the stats provider is returning an error. With `mock` provider this should never happen.
