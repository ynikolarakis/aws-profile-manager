<div align="center">

# AWS Profile Manager

**One dashboard for all your AWS profiles. Terminal, AI commands, cost tracking — all local, all secure.**

[![GitHub release](https://img.shields.io/github/v/release/ynikolarakis/aws-profile-manager?style=flat-square)](https://github.com/ynikolarakis/aws-profile-manager/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![React 19](https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?style=flat-square&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/yiannisnikolarakis)

<br />

<img src="https://awsprofilemanager.com/screenshots/hero-dark.png" alt="AWS Profile Manager" width="900" />

</div>

---

## What is this?

AWS Profile Manager is a local web application for managing all your AWS CLI profiles through a modern browser UI. No cloud backend, no data leaves your machine. Switch between dozens of AWS accounts, run commands, generate CLI commands with AI, track costs — all from one place.

Built for AWS consultants, DevOps engineers, and anyone managing multiple AWS accounts.

---

## Features

### Profile Management
- **3 profile types** — SSO (Identity Center), IAM Credentials, and Role Assume
- **Categories** — Organize profiles with custom named/colored groups
- **SSO Discovery** — Auto-discover all accounts and roles from AWS Organizations
- **Import/Export** — Backup and share profile configurations as JSON
- **Auto-save** — Every change writes directly to `~/.aws/config` and `~/.aws/credentials` with automatic backups

<img src="https://awsprofilemanager.com/screenshots/sidebar-expanded.png" alt="Profile sidebar with categories" width="900" />

### Built-in Terminal
- Execute AWS CLI commands with real-time streaming output
- **Bulk Run** — Run the same command across multiple profiles simultaneously
- Profile-aware environment — automatically sets `AWS_PROFILE`, access keys, and region
- Command history and favorite commands for quick access
- Configurable output encoding (UTF-8, CP437, CP1252, Latin-1, and more)

<img src="https://awsprofilemanager.com/screenshots/profile-detail.png" alt="Terminal with CLI output" width="900" />

### AI Command Generation
- Describe what you want in plain English, get the AWS CLI command
- **6 AI providers** — AWS Bedrock, Anthropic, OpenAI, Google Gemini, OpenRouter, Ollama (local)
- Streaming response with live preview
- Context-aware — knows your active profile, region, and account
- Region aliases — say "Frankfurt" and it maps to `eu-central-1`

<img src="https://awsprofilemanager.com/screenshots/ai-mode.png" alt="AI command generation" width="900" />

### Cost Explorer
- Per-profile monthly cost breakdown by AWS service
- Month/year navigation with visual cost bars
- Automatic cost badges on profiles in the sidebar

### Command Palette
- `Ctrl+K` to open — search profiles, switch accounts, trigger actions
- Keyboard-first design — every action has a shortcut

<img src="https://awsprofilemanager.com/screenshots/command-palette.png" alt="Command palette" width="900" />

### SSO Account Discovery
- Auto-discover all available SSO accounts and roles from your AWS Organizations
- Selective import with duplicate detection
- Batch profile creation from discovered accounts

### Security
- **100% local** — no cloud backend, no telemetry, no data leaves your machine
- API keys and secrets are masked in the UI
- Automatic timestamped backups before every config write
- Credentials are never logged or exposed in error messages

---

## Quick Start

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **AWS CLI v2** installed and configured

### Installation

```bash
git clone https://github.com/ynikolarakis/aws-profile-manager.git
cd aws-profile-manager

# Install dependencies
make setup
```

### Running

```bash
# Development mode (hot reload)
make dev

# Production mode
make build
make start
```

Open [http://localhost:5173](http://localhost:5173) (dev) or [http://localhost:8099](http://localhost:8099) (production).

### Legacy Mode

The original single-file version (no Node.js required):

```bash
make legacy
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Command palette |
| `Ctrl+N` | New profile |
| `Ctrl+I` | Toggle AI mode |
| `Ctrl+/` | Focus terminal |
| `Escape` | Close dialogs |

---

## AI Providers

| Provider | Type | Models |
|----------|------|--------|
| **AWS Bedrock** | Cloud | Claude, Titan, Llama |
| **Anthropic** | Cloud | Claude Opus, Sonnet, Haiku |
| **OpenAI** | Cloud | GPT-4o, GPT-4.1, O3 |
| **Google AI** | Cloud | Gemini 2.5 Pro, Flash |
| **OpenRouter** | Cloud | Multi-model gateway |
| **Ollama** | Local | Any local model |

Configure providers in **Settings > AI Providers**. Each provider can be tested before use.

<img src="https://awsprofilemanager.com/screenshots/settings-ai.png" alt="AI provider settings" width="900" />

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, Uvicorn, boto3 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI, Framer Motion |
| Terminal | xterm.js, WebSocket, SSE |
| State | Zustand, TanStack React Query |
| Fonts | Geist Sans, Geist Mono |

---

## Project Structure

```
aws-profile-manager/
├── backend/               # FastAPI backend
│   ├── main.py            # Routes and app setup
│   ├── api_service.py     # Core business logic
│   ├── llm_service.py     # AI provider abstraction
│   ├── aws_config.py      # AWS file I/O
│   ├── constants.py       # Services, regions
│   ├── models.py          # Pydantic models
│   ├── state_manager.py   # App state persistence
│   └── event_bus.py       # SSE event system
├── frontend/              # React frontend
│   └── src/
│       ├── components/    # UI components
│       ├── hooks/         # SSE and WebSocket hooks
│       ├── lib/           # API client, utilities
│       ├── store.ts       # Zustand state
│       └── types.ts       # TypeScript types
├── legacy/                # v7 single-file version
│   ├── app.py             # Python HTTP server
│   └── ui.html            # Single-file frontend
└── Makefile               # Build and dev commands
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `~/.aws/config` | AWS CLI profile definitions (INI format) |
| `~/.aws/credentials` | IAM access keys (INI format) |
| `~/.aws/profile-manager.json` | App state — categories, favorites, theme, AI settings |

---

## Support

If you find this project useful, consider supporting development:

<a href="https://buymeacoffee.com/yiannisnikolarakis">
  <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee" />
</a>

---

## License

MIT License. See [LICENSE](LICENSE) for details.
