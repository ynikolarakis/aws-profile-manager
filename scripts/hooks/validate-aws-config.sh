#!/usr/bin/env bash
# Hook: PostToolUse (matcher: Bash)
# Validates AWS config files aren't corrupted after bash commands

set -euo pipefail

AWS_DIR="$HOME/.aws"
CONFIG_FILE="$AWS_DIR/config"
CREDENTIALS_FILE="$AWS_DIR/credentials"

# Only run if AWS config files exist
if [ ! -d "$AWS_DIR" ]; then
    exit 0
fi

ERRORS=0

# Validate config file syntax (INI format)
if [ -f "$CONFIG_FILE" ]; then
    python -c "
import configparser
c = configparser.ConfigParser()
c.read('$CONFIG_FILE')
sections = c.sections()
if not sections:
    print('WARNING: AWS config file has no sections')
" 2>/dev/null || {
        echo "ERROR: AWS config file ($CONFIG_FILE) is corrupted or unreadable"
        ERRORS=1
    }
fi

# Validate credentials file syntax (INI format)
if [ -f "$CREDENTIALS_FILE" ]; then
    python -c "
import configparser
c = configparser.ConfigParser()
c.read('$CREDENTIALS_FILE')
" 2>/dev/null || {
        echo "ERROR: AWS credentials file ($CREDENTIALS_FILE) is corrupted or unreadable"
        ERRORS=1
    }
fi

# Check that credentials file doesn't have overly permissive permissions (Unix only)
if [[ "$(uname)" != MINGW* && "$(uname)" != MSYS* ]]; then
    if [ -f "$CREDENTIALS_FILE" ]; then
        PERMS=$(stat -c '%a' "$CREDENTIALS_FILE" 2>/dev/null || stat -f '%Lp' "$CREDENTIALS_FILE" 2>/dev/null || echo "unknown")
        if [ "$PERMS" != "600" ] && [ "$PERMS" != "644" ] && [ "$PERMS" != "unknown" ]; then
            echo "WARNING: AWS credentials file has permissions $PERMS (recommended: 600)"
        fi
    fi
fi

if [ $ERRORS -ne 0 ]; then
    echo "AWS config validation found issues. Check backup files in $AWS_DIR for recovery."
fi

exit 0
