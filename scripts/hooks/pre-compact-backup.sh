#!/usr/bin/env bash
# Hook: PreCompact
# Backs up the current conversation context before compaction

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/.claude/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Save PROGRESS.md snapshot (this survives compaction via file, but good to have history)
if [ -f "$PROJECT_DIR/PROGRESS.md" ]; then
    cp "$PROJECT_DIR/PROGRESS.md" "$BACKUP_DIR/PROGRESS_${TIMESTAMP}.md"
fi

# Clean up old backups (keep last 10)
ls -t "$BACKUP_DIR"/PROGRESS_*.md 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true

echo "Pre-compaction backup saved to $BACKUP_DIR"
