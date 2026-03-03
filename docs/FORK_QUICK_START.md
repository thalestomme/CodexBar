---
summary: "Fork quick start: differences from upstream and development commands."
read_when:
  - Onboarding to the fork workflow
  - Reviewing fork-specific changes
---

# CodexBar Fork — Quick Start

**Upstream:** [steipete/CodexBar](https://github.com/steipete/CodexBar) (macOS-only, SwiftUI)
**This fork:** [thalestomme/CodexBar](https://github.com/thalestomme/CodexBar) (cross-platform, Tauri)

## What this fork changes

1. **Preserves Augment provider** — removed upstream, kept here
2. **Adds a Tauri app** (`tauri-app/`) — cross-platform system tray UI replacing SwiftUI/AppKit
3. **Does not modify upstream Swift code** — `CodexBarCore` and `CodexBarCLI` stay in sync

The Tauri app spawns `codexbar usage --json` and renders the output as an HTML popup with usage bars, tabs, and settings.

## Development

```bash
# Build the CLI (needed by the Tauri app)
swift build --product CodexBarCLI

# Run the Tauri app
cd tauri-app
npm install
npx tauri dev

# Quick compile check (faster feedback loop)
cd tauri-app/src-tauri && cargo check

# Swift tests
swift test

# Format + lint
swiftformat Sources Tests
swiftlint --strict
```

## Key directories

- `tauri-app/` — Tauri app (Rust backend + TypeScript/HTML frontend)
- `Sources/CodexBarCore/` — Shared business logic (synced from upstream)
- `Sources/CodexBarCLI/` — CLI binary (synced from upstream)
- `Sources/CodexBarCore/Providers/Augment/` — Augment provider (fork-specific)

## Upstream sync

```bash
git fetch upstream
git merge upstream/main
```

Fork maintenance scripts in `Scripts/`: `check_upstreams.sh`, `review_upstream.sh`, `prepare_upstream_pr.sh`.

## Docs

- [Architecture](architecture.md) — modules, data flow, cross-platform guidelines
- [Fork TODO](FORK_TODO.md) — living todolist with phased work items
- [Upstream strategy](UPSTREAM_STRATEGY.md) — sync and contribution policy
- [Provider authoring](provider.md) — how to add a new provider
