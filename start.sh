#!/usr/bin/env bash
# Ghost (gHosted) — quick start on macOS/Linux: chmod +x start.sh && ./start.sh
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install 18+ LTS from https://nodejs.org" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  if [ -f package-lock.json ]; then npm ci; else npm install; fi
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Created .env from .env.example — set DATABASE_URL for Postgres."
fi

echo "Starting Ghost at http://localhost:5000 …"
exec npm run dev
