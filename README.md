# CodexBar — Cross-Platform Fork

System tray app that monitors usage quotas and credits across 20+ AI provider services. This fork replaces the macOS-only SwiftUI/AppKit frontend with a **Tauri app** (Rust + TypeScript) that runs on **Linux and macOS** (Windows planned).

The upstream Swift backend (`CodexBarCore`, `CodexBarCLI`) is kept in sync — this fork only changes the UI layer.

**Upstream:** [steipete/CodexBar](https://github.com/steipete/CodexBar) (macOS-only, SwiftUI)
**This fork:** [thalestomme/CodexBar](https://github.com/thalestomme/CodexBar) (cross-platform, Tauri)

<img src="codexbar.png" alt="CodexBar menu screenshot" width="520" />

## How it works

```
Tauri App (Rust + HTML/CSS/TS)
    │  spawns
    ▼
codexbar usage --json  (CodexBarCLI binary)
    │  calls
    ▼
CodexBarCore  (providers, auth, parsing)
```

The Tauri app spawns the `codexbar` CLI and renders the JSON output as a popup with usage bars, provider tabs, and settings — matching the macOS app's experience in a cross-platform shell.

## What works

- Tray icon with popup window (positioned near cursor, with Linux/Wayland workarounds)
- 29 providers with enable/disable toggles and auth-type guidance
- Usage progress bars (primary/secondary/tertiary) with green/yellow/red color coding
- Reset countdown formatting and provider cost display
- Account email + org display, status indicators (minor/major/critical/maintenance)
- Error states with auth guidance
- Background auto-refresh (5-minute loop via CLI)
- Dark/light mode (prefers-color-scheme)
- Settings panel: API key entry, provider source overrides
- Blur-to-dismiss popup

See [docs/FORK_TODO.md](docs/FORK_TODO.md) for the full gap analysis vs the macOS app.

## Providers

14 of 20+ providers work on Linux via API token, OAuth, or CLI strategies. 7 web-only providers (requiring browser cookies / WebKit) fail gracefully with clear error messages.

| Working on Linux | Strategy |
|---|---|
| Claude | CLI (PTY) / OAuth |
| Codex | CLI (PTY) / OAuth |
| Gemini | API key |
| Copilot | API token |
| Kilo | API + CLI |
| OpenRouter | API token |
| z.ai | API token |
| Warp | API token |
| Kimi K2 | API token |
| Vertex AI | OAuth |
| JetBrains AI | CLI (file-based) |
| Antigravity | CLI |
| Kiro | CLI |
| Augment | CLI |

See [docs/architecture.md](docs/architecture.md) for the full platform support matrix and macOS-only provider list.

## Install

> **Note:** No pre-built releases yet. Build from source for now.

### Requirements

- [Swift 6+](https://www.swift.org/install/) (to build the CLI)
- [Rust + Cargo](https://rustup.rs/) (to build the Tauri app)
- Node.js 18+ and npm

### Build & run

```bash
# 1. Build the CLI
swift build --product CodexBarCLI

# 2. Build & launch the Tauri app
cd tauri-app
npm install
npx tauri dev
```

### First run

1. The tray icon appears in your system tray — click it to open the popup.
2. Go to Settings and enable the providers you use.
3. Install/sign in to provider sources (e.g. `codex`, `claude`, `gemini` CLIs, or enter API keys).

## Development

```bash
# Quick compile check (faster than full tauri dev)
cd tauri-app/src-tauri && cargo check

# Run the Tauri app in dev mode
cd tauri-app && npx tauri dev

# Build the Swift CLI (debug)
swift build --product CodexBarCLI

# Run Swift tests
swift test

# Format + lint Swift code
swiftformat Sources Tests
swiftlint --strict
```

Key files:

| Path | Purpose |
|---|---|
| `tauri-app/src-tauri/src/tray.rs` | Tray icon setup, menu events, click handling |
| `tauri-app/src-tauri/src/window.rs` | Popup toggle, positioning, blur-to-dismiss |
| `tauri-app/src-tauri/src/cli_bridge.rs` | CLI spawning, JSON parsing, provider overrides |
| `tauri-app/src-tauri/src/settings.rs` | Settings persistence |
| `tauri-app/src/` | TypeScript/HTML frontend (popup UI) |

## Docs

- [Architecture](docs/architecture.md) — modules, data flow, cross-platform guidelines, SPM dependencies
- [Fork TODO](docs/FORK_TODO.md) — living todolist with phased work items and gap analysis
- [Provider authoring](docs/provider.md) — how to add a new provider
- [CLI reference](docs/cli.md) — `codexbar` command-line usage
- [Upstream sync strategy](docs/UPSTREAM_STRATEGY.md) — how we stay in sync with upstream

## Fork goals

1. **Preserve Augment provider** — removed upstream, kept here
2. **Cross-platform UI** — Tauri replaces SwiftUI/AppKit so it works on Linux (and eventually Windows)
3. **Don't modify upstream Swift code** — the backend stays in sync; platform gaps are upstream's concern

## Upstream sync

```bash
git fetch upstream
git merge upstream/main
```

Since this fork only modifies the UI layer, merge conflicts with upstream backend changes should be rare.

## Credits

Original project by Peter Steinberger ([steipete](https://twitter.com/steipete)). Upstream: [steipete/CodexBar](https://github.com/steipete/CodexBar).

Inspired by [ccusage](https://github.com/ryoppippi/ccusage) (MIT).

## License

MIT
