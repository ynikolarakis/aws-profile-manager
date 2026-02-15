#!/usr/bin/env bash
# Hook: SessionStart
# Loads project context and displays status on session start

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "=== AWS Profile Manager — Session Start ==="

# Show git status if in a git repo
if [ -d "$PROJECT_DIR/.git" ]; then
    echo ""
    echo "Git branch: $(git -C "$PROJECT_DIR" branch --show-current 2>/dev/null || echo 'unknown')"
    CHANGES=$(git -C "$PROJECT_DIR" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
    echo "Uncommitted changes: $CHANGES"
fi

# Show PROGRESS.md summary if it exists
if [ -f "$PROJECT_DIR/PROGRESS.md" ]; then
    echo ""
    echo "--- PROGRESS.md (last 10 lines) ---"
    tail -n 10 "$PROJECT_DIR/PROGRESS.md"
fi

# Check if AWS CLI is available
if command -v aws &>/dev/null; then
    echo ""
    echo "AWS CLI: $(aws --version 2>&1 | head -1)"
else
    echo ""
    echo "WARNING: AWS CLI not found in PATH"
fi

# Check active AWS profile
if [ -n "${AWS_PROFILE:-}" ]; then
    echo "Active AWS profile: $AWS_PROFILE"
else
    echo "Active AWS profile: default"
fi

echo ""
echo "=== Ready ==="
