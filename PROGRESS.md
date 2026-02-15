# AWS Profile Manager — Progress Tracker

> This file is a living document. Claude Code updates it as work progresses.
> It survives context compaction — always check here for current state.

## Current Phase: Infrastructure Setup

### Completed
- [x] Created CLAUDE.md with project instructions and architecture overview
- [x] Created .claude/settings.json with permissions, hooks, and env vars (Opus model, no token limits)
- [x] Created 4 custom subagents in .claude/agents/
  - aws-architect.md — AWS architecture advisor
  - frontend-builder.md — React/shadcn/ui specialist
  - test-writer.md — Testing specialist (pytest + Vitest + Playwright)
  - security-reviewer.md — Security auditor
- [x] Created 3 custom commands in .claude/commands/
  - dev-setup.md — Initialize development environment
  - cost-report.md — Generate cost report
  - build-feature.md — Feature implementation workflow
- [x] Created 2 skills for domain knowledge
  - skills/aws-profile-patterns/SKILL.md — AWS profile management patterns
  - skills/linear-design-system/SKILL.md — UI design system rules
- [x] Created 5 hook scripts in scripts/hooks/
  - session-start.sh — Load context on session start
  - post-edit-lint.sh — Lint after file edits
  - pre-compact-backup.sh — Backup before compaction
  - validate-aws-config.sh — Validate AWS config integrity
  - block-dangerous-commands.sh — Block destructive commands
- [x] Created target directory structure (backend/, frontend/, tests/, legacy/)
- [x] Copied current v7 files to legacy/ directory
- [x] Created PROGRESS.md (this file)

### Next Steps
- [ ] Initialize git repository with .gitignore
- [ ] Set up MCP servers (core, aws-docs, cost-analysis)
- [ ] Phase 1: Backend migration (stdlib http.server -> FastAPI + WebSocket)
- [ ] Phase 1: Frontend migration (single HTML -> React + Vite + shadcn/ui)
- [ ] Phase 1: Terminal migration (custom div -> xterm.js)
- [ ] Phase 1: Comprehensive test suite (pytest + vitest + playwright)

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend framework | FastAPI | Async, WebSocket native, Pydantic validation |
| Frontend framework | React 19 + Vite | Component model, ecosystem, shadcn/ui compatibility |
| CSS | Tailwind CSS 4 | Matches Linear design system, utility-first |
| Terminal | xterm.js + WebSocket | True terminal emulation, WebSocket for streaming |
| State management | Zustand + React Query | Simple global state + server state caching |
| State persistence | SQLite (future) | Better than JSON for concurrent access |
| Testing | pytest + vitest + Playwright | Full stack coverage |
| Model | Claude Opus 4.6 | Full power, no thinking limits, subagents also Opus |

## File Map

```
aws-profile-manager/
├── CLAUDE.md                    # Project instructions
├── PROGRESS.md                  # This file
├── .claude/
│   ├── settings.json            # Permissions, hooks, env vars
│   ├── agents/                  # 4 custom subagents
│   └── commands/                # 3 custom commands
├── skills/                      # 2 domain knowledge skills
├── scripts/hooks/               # 5 lifecycle hooks
├── legacy/                      # Current v7 (reference)
│   ├── app.py
│   ├── ui.html
│   ├── logo.png, icon.ico
│   ├── build_exe.bat, run.bat
├── backend/                     # FastAPI backend (to build)
├── frontend/                    # React frontend (to build)
└── tests/                       # Test suites (to build)
```
