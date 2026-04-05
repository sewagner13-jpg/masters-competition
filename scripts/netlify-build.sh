#!/usr/bin/env bash
set -euo pipefail

npx prisma generate

if [ "${CONTEXT:-}" = "production" ]; then
  echo "Netlify production deploy: syncing player pool to database"
  npm run db:seed
else
  echo "Skipping player pool seed for Netlify context: ${CONTEXT:-unknown}"
fi

npm run build
