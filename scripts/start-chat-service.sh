#!/bin/bash
# Start the chat-service WebSocket mini-service in a fully detached,
# survive-parent-death way. Uses setsid + nohup + & to ensure the
# process keeps running even if the launching shell exits.
#
# Usage:  bash scripts/start-chat-service.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVICE_DIR="$PROJECT_ROOT/mini-services/chat-service"
LOG_FILE="$SERVICE_DIR/chat-service.log"
PID_FILE="$SERVICE_DIR/chat-service.pid"

# Kill any previous instance
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "[start-chat] killing previous instance PID=$OLD_PID"
    kill -9 "$OLD_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

# Also kill any other bun process running our index.ts
pkill -9 -f "bun.*chat-service/index" 2>/dev/null || true
sleep 1

# Start fresh
cd "$SERVICE_DIR"
# setsid: detach from controlling terminal
# nohup: ignore SIGHUP
# </dev/null: don't wait for stdin
# &: background
# disown: remove from shell job table
setsid nohup bun index.ts > "$LOG_FILE" 2>&1 < /dev/null &
NEW_PID=$!
disown
echo "$NEW_PID" > "$PID_FILE"

# Wait a moment and verify it's alive
sleep 3
if kill -0 "$NEW_PID" 2>/dev/null; then
  echo "[start-chat] chat-service started PID=$NEW_PID"
  echo "[start-chat] log: $LOG_FILE"
else
  echo "[start-chat] ERROR: process died immediately"
  echo "[start-chat] last log lines:"
  tail -20 "$LOG_FILE" 2>/dev/null || echo "(no log)"
  exit 1
fi
