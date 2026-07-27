#!/usr/bin/env bash
set -e

# 1. Ensure PostgreSQL is running
if ! pg_isready -q >/dev/null 2>&1; then
  echo "[dev:api] PostgreSQL is not ready. Attempting to start via systemctl..."
  sudo systemctl start postgresql
  sleep 2
  if ! pg_isready -q >/dev/null 2>&1; then
    echo "[dev:api] ERROR: PostgreSQL could not be started. Please start it manually."
    exit 1
  fi
else
  echo "[dev:api] PostgreSQL is running."
fi

# 2. Ensure Redis is running
if ! redis-cli ping >/dev/null 2>&1; then
  echo "[dev:api] Redis is not running. Attempting to start Redis..."
  if command -v redis-server >/dev/null 2>&1; then
    redis-server --daemonize yes
  elif command -v brew >/dev/null 2>&1; then
    brew services start redis
  else
    echo "[dev:api] WARNING: Could not auto-start Redis. Please start Redis manually."
  fi
else
  echo "[dev:api] Redis is running."
fi

# 3. Launch CRM API
echo "[dev:api] Starting dotnet watch..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../apps/api-crm"
export DOTNET_USE_POLLING_FILE_WATCHER=1
exec dotnet watch run --urls https://localhost:5005
