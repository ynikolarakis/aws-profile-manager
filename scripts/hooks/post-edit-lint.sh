#!/usr/bin/env bash
# Hook: PostToolUse (matcher: Write|Edit)
# Runs linting after file edits

set -euo pipefail

# Get the edited file from hook context (passed as argument or env var)
FILE="${1:-}"

if [ -z "$FILE" ]; then
    exit 0
fi

# Python files — run ruff if available
if [[ "$FILE" == *.py ]]; then
    if command -v ruff &>/dev/null; then
        ruff check --fix "$FILE" 2>/dev/null || true
    fi
fi

# TypeScript/JavaScript files — run eslint if available
if [[ "$FILE" == *.ts || "$FILE" == *.tsx || "$FILE" == *.js || "$FILE" == *.jsx ]]; then
    if command -v npx &>/dev/null && [ -f "$(dirname "$FILE")/node_modules/.bin/eslint" ] 2>/dev/null; then
        npx eslint --fix "$FILE" 2>/dev/null || true
    fi
fi

# JSON files — validate syntax
if [[ "$FILE" == *.json ]]; then
    python -c "import json; json.load(open('$FILE'))" 2>/dev/null || {
        echo "WARNING: Invalid JSON in $FILE"
        exit 1
    }
fi

exit 0
