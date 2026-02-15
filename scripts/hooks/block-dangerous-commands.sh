#!/usr/bin/env bash
# Hook: PreToolUse (matcher: Bash)
# Blocks dangerous AWS and system commands
# Exit code 2 = block the command

set -euo pipefail

# The command to be executed is passed as an argument
COMMAND="${1:-}"

if [ -z "$COMMAND" ]; then
    exit 0
fi

# Block patterns — exit 2 to prevent execution
BLOCKED_PATTERNS=(
    "aws .* delete-stack"
    "aws .* terminate-instances"
    "aws .* delete-bucket"
    "aws .* delete-table"
    "aws .* delete-cluster"
    "aws .* delete-db-instance"
    "aws .* delete-function"
    "aws .* delete-role"
    "aws .* delete-user"
    "aws .* delete-policy"
    "aws .* delete-vpc"
    "aws .* delete-subnet"
    "aws .* delete-security-group"
    "rm -rf /"
    "rm -rf ~"
    "rm -rf \$HOME"
    "rm -rf /home"
    "mkfs\\."
    "dd if=.* of=/dev/"
    "> /dev/sd"
    "chmod -R 777 /"
    ":(){ :|:& };:"
)

for PATTERN in "${BLOCKED_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qE "$PATTERN"; then
        echo "BLOCKED: Command matches dangerous pattern: $PATTERN"
        echo "If you need to run this command, please do so manually outside of Claude Code."
        exit 2
    fi
done

# Warn patterns — allow but warn
WARN_PATTERNS=(
    "aws .* --force"
    "git push.*--force"
    "git reset --hard"
    "pip install.*--break-system-packages"
    "npm install -g"
)

for PATTERN in "${WARN_PATTERNS[@]}"; do
    if echo "$COMMAND" | grep -qE "$PATTERN"; then
        echo "WARNING: Command matches potentially dangerous pattern: $PATTERN"
        echo "Proceeding with caution..."
    fi
done

exit 0
