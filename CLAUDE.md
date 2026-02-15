# AWS Profile Manager

## Overview
Local web application for managing AWS CLI profiles through a modern browser UI.
Backend: Python (currently stdlib http.server, migrating to FastAPI).
Frontend: HTML/JS (currently single file, migrating to React + Vite + shadcn/ui).

## Architecture
- `legacy/app.py` — Python HTTP backend (492 lines, all business logic)
- `legacy/ui.html` — Single-file frontend (47K chars, Geist Sans/Mono, blue accent)
- `~/.aws/config` — AWS CLI profile definitions (INI format)
- `~/.aws/credentials` — AWS CLI access keys (INI format)
- `~/.aws/profile-manager.json` — App state (categories, favorites, theme)

## Key Design Decisions
- Auto-save: Profile saves write directly to AWS CLI files. No separate save step.
- Linear-style UI: Monochrome zinc + blue accent, floating context menus, slide-over sheets.
- Terminal-first: Terminal occupies the main area. Everything else is secondary.
- Local-only: No cloud backend. Everything runs on user's machine.
- No framework lock-in: Backend is pure Python, frontend is vanilla JS (for now).

## AWS Specifics
- Primary region: eu-central-1
- Cost Explorer always uses: us-east-1
- SSO tokens cached in: ~/.aws/sso/cache/
- Profile types: sso, credentials, role

## Commands
- Start (legacy): `python legacy/app.py` (opens browser to localhost)
- Start (new): `make dev` (runs backend + frontend concurrently)
- Test: `pytest tests/`
- Lint: `ruff check . && eslint frontend/`
- Build: `make build`

## Rules
- NEVER expose AWS credentials in logs, error messages, or UI
- ALWAYS validate profile names (no spaces, no special chars except hyphen/underscore/dot)
- ALWAYS handle boto3 exceptions gracefully with user-friendly messages
- NEVER require the user to manually edit AWS config files
- Terminal commands run in subprocesses with the active profile's environment
- Use structured JSON errors in API responses, never crash
- ALWAYS create timestamped backups before writing to ~/.aws/config or ~/.aws/credentials

## Style Guide
- Font: Geist Sans (UI), Geist Mono (code/terminal)
- Accent: #3b82f6 (blue-500)
- Background: #09090b (dark), #fafafa (light)
- Use shadcn/ui components when building React
- Follow Linear/Vercel design patterns
- Minimal formatting, no decorative elements
- Animations: spring-based, <200ms, using Framer Motion
- Keyboard-first: every action should have a shortcut

## Profile Types

### SSO
Uses `sso_start_url`, `sso_region`, `sso_account_id`, `sso_role_name`.
Session tokens cached in `~/.aws/sso/cache/`. Login via `aws sso login --profile <name>`.

### Credentials
Uses `aws_access_key_id`, `aws_secret_access_key`, optional `aws_session_token`.
Written to `~/.aws/credentials` under `[profile-name]` section.

### Role
Uses `role_arn`, `source_profile`, optional `external_id`.
Assumes a role from a source profile. No credentials stored directly.

## Config File Format
- `~/.aws/config` uses INI format with `[profile name]` sections (except `[default]`)
- `~/.aws/credentials` uses `[name]` sections (no "profile" prefix)
- Both files must be written atomically with backup

## Migration Plan (Current -> Target)
1. Backend: stdlib http.server -> FastAPI + uvicorn (WebSocket for terminal)
2. Frontend: Single HTML -> React + Vite + TypeScript + Tailwind + shadcn/ui
3. Terminal: Custom div -> xterm.js with WebSocket
4. State: JSON file -> SQLite (with migration path)
5. Testing: None -> pytest + vitest + playwright
