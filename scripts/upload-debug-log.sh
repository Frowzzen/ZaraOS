#!/usr/bin/env bash
# ============================================================
# ZaraOS — Developer debug log uploader
#
# Run this on the Dell after reproducing a bug to push the
# native app's debug log to GitHub so the agent can review it.
#
# Usage:
#   bash ~/ZaraOS/scripts/upload-debug-log.sh
#
# The log is committed to logs/debug.log on main and pushed.
# Regular users never need this script.
# ============================================================

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_SRC="/tmp/zaraos-debug.log"
LOG_DST="$REPO_DIR/logs/debug.log"

# ── Pre-flight checks ──────────────────────────────────────────────────────────

if [ ! -f "$LOG_SRC" ]; then
  echo "ERROR: No debug log found at $LOG_SRC"
  echo "       Launch ZaraOS (cargo tauri dev or the release binary) and reproduce"
  echo "       the issue first, then run this script."
  exit 1
fi

LOG_LINES=$(wc -l < "$LOG_SRC")
if [ "$LOG_LINES" -lt 3 ]; then
  echo "WARNING: Log file looks empty ($LOG_LINES lines). Did the app start?"
fi

# ── Copy & commit ──────────────────────────────────────────────────────────────

mkdir -p "$REPO_DIR/logs"
cp "$LOG_SRC" "$LOG_DST"

cd "$REPO_DIR"

git add logs/debug.log
git diff --cached --quiet && {
  echo "No changes in log since last upload — forcing update."
  git add -f logs/debug.log
}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
git commit -m "logs: debug upload $TIMESTAMP ($LOG_LINES lines)"
git push origin main

echo ""
echo "Done! Log uploaded: $LOG_LINES lines"
echo "The agent can now pull and review logs/debug.log"
echo ""
echo "Tail of log:"
tail -20 "$LOG_DST"
