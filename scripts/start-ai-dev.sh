#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AI_DIR="$SCRIPT_DIR/../apps/api-ai-analytics"

# Ensure MongoDB & Redis databases are running
"$SCRIPT_DIR/ensure-ai-dbs.sh"

# Ensure virtual environment & uvicorn are installed
if [ ! -f "$AI_DIR/.venv/bin/uvicorn" ]; then
  echo "[dev:ai] Python virtual environment missing or incomplete. Setting up .venv..."
  cd "$AI_DIR"
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

# Launch AI Analytics service
echo "[dev:ai] Starting FastAPI app..."
cd "$AI_DIR"
exec .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 4005
