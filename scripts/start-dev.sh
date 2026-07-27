#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

# ─── Ensure all databases are running ────────────────────────────────────────

echo "═══════════════════════════════════════════════════════"
echo " SentraCX — Starting all services"
echo "═══════════════════════════════════════════════════════"
echo ""

# 1. PostgreSQL (required by api-crm)
echo "[dev] Checking PostgreSQL..."
if ! pg_isready -q >/dev/null 2>&1; then
  echo "[dev] PostgreSQL is not ready. Attempting to start via systemctl..."
  sudo systemctl start postgresql
  sleep 2
  if ! pg_isready -q >/dev/null 2>&1; then
    echo "[dev] ERROR: PostgreSQL could not be started. Please start it manually."
    exit 1
  fi
fi
echo "[dev] ✓ PostgreSQL is running."

# 2. Redis (required by api-crm and api-ai-analytics)
echo "[dev] Checking Redis..."
if ! redis-cli ping >/dev/null 2>&1; then
  echo "[dev] Redis is not running. Attempting to start..."
  if command -v redis-server >/dev/null 2>&1; then
    redis-server --daemonize yes
  elif command -v brew >/dev/null 2>&1; then
    brew services start redis
  else
    echo "[dev] ERROR: Could not auto-start Redis. Please start Redis manually."
    exit 1
  fi
fi
echo "[dev] ✓ Redis is running."

# 3. MongoDB (required by api-ai-analytics)
echo "[dev] Checking MongoDB..."
if ! mongosh --quiet --eval "db.runCommand({ping:1})" >/dev/null 2>&1; then
  echo "[dev] MongoDB is not running. Starting MongoDB..."
  mkdir -p "$HOME/.local/share/mongodb/data" "$HOME/.local/share/mongodb/log"
  mongod --dbpath "$HOME/.local/share/mongodb/data" \
         --logpath "$HOME/.local/share/mongodb/log/mongod.log" \
         --fork --port 27017
fi
echo "[dev] ✓ MongoDB is running."

echo ""
echo "[dev] All databases ready. Launching services..."
echo ""

# ─── Launch all three services concurrently ──────────────────────────────────

# Trap SIGINT/SIGTERM to kill all child processes on Ctrl+C
cleanup() {
  trap - SIGINT SIGTERM EXIT
  echo ""
  echo "[dev] Shutting down all services..."
  kill -- -$$ 2>/dev/null || kill 0 2>/dev/null
  wait 2>/dev/null
  echo "[dev] All services stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Ensure AI venv exists
AI_DIR="$ROOT_DIR/apps/api-ai-analytics"
if [ ! -f "$AI_DIR/.venv/bin/uvicorn" ]; then
  echo "[dev] Python virtual environment missing. Setting up .venv..."
  cd "$AI_DIR"
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
  cd "$ROOT_DIR"
fi

# Start web-crm (Next.js - port 3005)
echo "[dev] Starting web-crm on port 3005..."
npm --workspace=apps/web-crm run dev &

# Start api-crm (.NET - port 5005)
echo "[dev] Starting api-crm on port 5005..."
(
  cd "$ROOT_DIR/apps/api-crm"
  export DOTNET_USE_POLLING_FILE_WATCHER=1
  dotnet watch run --urls https://localhost:5005
) &

# Start api-ai-analytics (FastAPI - port 4005)
echo "[dev] Starting api-ai-analytics on port 4005..."
(
  cd "$AI_DIR"
  .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 4005
) &

echo ""
echo "═══════════════════════════════════════════════════════"
echo " Services:"
echo "   web-crm          → https://localhost:3005"
echo "   api-crm          → https://localhost:5005"
echo "   api-ai-analytics → http://localhost:4005"
echo ""
echo " Press Ctrl+C to stop all services"
echo "═══════════════════════════════════════════════════════"
echo ""

# Wait for all background processes
wait
