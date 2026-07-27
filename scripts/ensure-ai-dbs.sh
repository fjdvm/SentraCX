#!/usr/bin/env bash
set -e

# 1. Check & start Redis if not running
if ! redis-cli ping >/dev/null 2>&1; then
  echo "[ai-dbs] Redis is not running. Attempting to start Redis..."
  if command -v redis-server >/dev/null 2>&1; then
    redis-server --daemonize yes
  elif command -v brew >/dev/null 2>&1; then
    brew services start redis
  else
    echo "[ai-dbs] WARNING: Could not auto-start Redis. Please start Redis manually."
  fi
else
  echo "[ai-dbs] Redis is running."
fi

# 2. Check & start MongoDB if not running
if ! mongosh --quiet --eval "db.runCommand({ping:1})" >/dev/null 2>&1; then
  echo "[ai-dbs] MongoDB is not running. Starting MongoDB..."
  mkdir -p "$HOME/.local/share/mongodb/data" "$HOME/.local/share/mongodb/log"
  mongod --dbpath "$HOME/.local/share/mongodb/data" \
         --logpath "$HOME/.local/share/mongodb/log/mongod.log" \
         --fork --port 27017
else
  echo "[ai-dbs] MongoDB is running."
fi
