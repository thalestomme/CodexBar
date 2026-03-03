---
summary: "Architecture overview: modules, entry points, and data flow."
read_when:
  - Reviewing architecture before feature work
  - Refactoring app structure, app lifecycle, or module boundaries
---

# Architecture overview

## Modules
- `Sources/CodexBarCore`: fetch + parse (Codex RPC, PTY runner, Claude probes, OpenAI web scraping, status polling).
- `Sources/CodexBar`: state + UI (UsageStore, SettingsStore, StatusItemController, menus, icon rendering).
- `Sources/CodexBarWidget`: WidgetKit extension wired to the shared snapshot.
- `Sources/CodexBarCLI`: bundled CLI for `codexbar` usage/status output.
- `Sources/CodexBarMacros`: SwiftSyntax macros for provider registration.
- `Sources/CodexBarMacroSupport`: shared macro support used by app/core/CLI targets.
- `Sources/CodexBarClaudeWatchdog`: helper process for stable Claude CLI PTY sessions.
- `Sources/CodexBarClaudeWebProbe`: CLI helper to diagnose Claude web fetches.

## Entry points
- `CodexBarApp`: SwiftUI keepalive + Settings scene.
- `AppDelegate`: wires status controller, Sparkle updater, notifications.

## Data flow
- Background refresh → `UsageFetcher`/provider probes → `UsageStore` → menu/icon/widgets.
- Settings toggles feed `SettingsStore` → `UsageStore` refresh cadence + feature flags.

## Concurrency & platform
- Swift 6 strict concurrency enabled; prefer Sendable state and explicit MainActor hops.
- macOS 14+ targeting; avoid deprecated APIs when refactoring.

See also: `docs/providers.md`, `docs/refresh-loop.md`, `docs/ui.md`.

---

## Fork Architecture

This fork adds a Tauri-based cross-platform UI alongside the upstream macOS Swift app.

- **Upstream Swift backend** (`CodexBarCore`, `CodexBarCLI`) — synced from `steipete/CodexBar`, not modified
- **Tauri app** (`tauri-app/`) — fork-specific, targets Linux + macOS (Windows deferred)
- **CLI as API boundary** — Tauri spawns `codexbar usage --json`; the CLI is the interface between Swift and Tauri

```
┌─────────────────────────────────────────────┐
│  Tauri App (Rust + HTML/CSS/TS)             │
│  tauri-app/                                 │
│  ├── src-tauri/  (Rust: tray, window, CLI)  │
│  └── src/        (TS/HTML: popup UI)        │
│           │                                 │
│           │  spawns                         │
│           ▼                                 │
│  codexbar usage --json                      │
│  (CodexBarCLI binary)                       │
│           │                                 │
│           │  calls                          │
│           ▼                                 │
│  CodexBarCore                               │
│  (providers, auth, parsing)                 │
└─────────────────────────────────────────────┘
```

## SPM Dependency Graph

Understanding which dependencies are macOS-only vs cross-platform is critical for this fork.

### Always built (CLI + Core, works on Linux)

| Dependency | Used by | Purpose |
|---|---|---|
| **Commander** | CodexBarCLI | CLI argument parsing. Pure Swift, fully cross-platform. |
| **swift-log** (Logging) | CodexBarCore | Structured logging. Cross-platform. |
| **swift-syntax** | CodexBarMacros | `@ProviderDescriptor*` macros. Cross-platform (build-time only). |
| **SweetCookieKit** | CodexBarCore | Browser cookie access. **Compiles to an empty module on Linux** — every source file is wrapped in `#if os(macOS)`. The import resolves but exports nothing. CodexBarCore provides its own Linux stubs (`BrowserCookieImportOrder.swift` `#else` branch). |

### macOS-only (app target, gated by `#if os(macOS)` in Package.swift)

| Dependency | Used by | Purpose |
|---|---|---|
| **Sparkle** | CodexBar app | Auto-update framework. macOS only. |
| **KeyboardShortcuts** | CodexBar app | Global hotkey registration. macOS only. |

### How the CLI builds on Linux

The `Package.swift` uses `#if os(macOS)` to conditionally include the app targets (CodexBar, CodexBarWidget, CodexBarClaudeWebProbe, CodexBarClaudeWatchdog). On Linux, only these targets are defined: CodexBarCore, CodexBarMacros, CodexBarMacroSupport, CodexBarCLI, CodexBarLinuxTests. Sparkle and KeyboardShortcuts are never resolved.

SweetCookieKit *is* resolved and compiled on Linux, but produces zero symbols. All macOS-specific code paths in CodexBarCore are gated with `#if os(macOS)` at file or block level. The CLI has an additional catch-all in `CLIUsageCommand.swift` that intercepts web-source requests on non-macOS with a clean error message before they reach provider code.

## Platform Support Matrix

| Module | macOS | Linux | Windows |
|---|---|---|---|
| CodexBar (SwiftUI app) | Full | N/A | N/A |
| CodexBarCore | Full | Builds fully. macOS-only code (`#if os(macOS)`) compiles to nothing. ~17 providers functional. | Unknown |
| CodexBarCLI | Full | Builds fully. Web-source providers fail gracefully with clear error. | Unknown |
| Tauri app | Untested | Working | Blocked (no CLI, no .ico) |
| CodexBarWidget | Full | N/A | N/A |

## Cross-Platform Guidelines

Rules for code in this fork:

1. **Never add macOS-only code to the Tauri app** — all Rust must compile on Linux, macOS, Windows. Use `#[cfg]` only for platform optimizations with fallbacks.
2. **Don't modify upstream Swift code** unless necessary — platform gaps are upstream's concern.
3. **Frontend (TS/HTML/CSS) must be fully platform-agnostic** — no OS sniffing.
4. **CLI is the contract** — Tauri talks to Swift exclusively via `codexbar usage --json`. Provider errors are returned by the CLI; Tauri shows them gracefully.
5. **Platform-specific Rust** must be `#[cfg]` gated with fallbacks (e.g. KWin D-Bus → cursor position → center of screen).
6. **Bundle CLI as sidecar** for distribution — users should not need Swift installed.

## Provider Platform Availability

### Working on Linux (14 providers)

| Provider | Strategy | Notes |
|---|---|---|
| Claude | CLI (PTY) / OAuth (token file) | |
| Codex | CLI (PTY) / OAuth (API token) | |
| Gemini | API key | |
| Copilot | API token | |
| Kilo | API + CLI | |
| OpenRouter | API token | |
| z.ai | API token | |
| Warp | API token | |
| Kimi K2 | API token | |
| Vertex AI | OAuth | |
| JetBrains | CLI (file-based) | Has a regex XML parser fallback for Linux since `XMLDocument` is macOS-only |
| Antigravity | CLI | |
| Kiro | CLI | |
| Augment | CLI | `AuggieCLIProbe` returns `.notSupported` on Linux — fails gracefully |

### macOS-only (7 providers, fail gracefully on Linux)

| Provider | Why | CLI guard |
|---|---|---|
| Cursor | Browser cookies (SweetCookieKit) | `CLIUsageCommand.swift` returns "selected source requires web support and is only supported on macOS" |
| Amp | Browser cookies | Same |
| Ollama | Browser cookies | Same |
| Factory | Browser cookies + localStorage | Same |
| OpenCode | Browser cookies | Same |
| Kimi (web) | Browser cookies | Same (API path via Kimi K2 works) |
| MiniMax (web) | Browser cookies + localStorage | Same (API path works if key provided) |
| OpenAI (web) | WebKit scraping (`OpenAIWeb/` — 6 files) | Same |
| Claude (web) | WebKit + cookies (`ClaudeWebAPIFetcher`) | Same |

The CLI's `#if !os(macOS)` guard in `CLIUsageCommand.swift` is the catch-all — it checks if the resolved source mode requires web support and returns a clean error *before* calling into any provider code.

See `docs/FORK_TODO.md` for the portability audit details and open tasks.

## Docs Index

The `docs/` directory contains 48+ files. Here they are grouped by relevance:

### Fork-specific docs (our additions)

- `FORK_TODO.md` — living todolist of cross-platform work
- `FORK_QUICK_START.md` — fork overview and quick commands
- `FORK_SETUP.md` — multi-upstream remote configuration
- `UPSTREAM_STRATEGY.md` — upstream sync and contribution policy
- `QUOTIO_ANALYSIS.md` — analysis template for quotio patterns
- `quotio-comparison.md` — feature comparison with quotio
- `session-keepalive-design.md` — session keepalive system design

### Upstream docs (synced, reference only)

- **Core**: `architecture.md`, `DEVELOPMENT.md`, `DEVELOPMENT_SETUP.md`, `configuration.md`
- **Release**: `RELEASING.md`, `releasing-homebrew.md`, `packaging.md`, `sparkle.md`
- **UI/Features**: `ui.md`, `widgets.md`, `webkit.md`, `icon.md`, `refresh-loop.md`, `status.md`
- **Providers**: `provider.md` (authoring guide), `providers.md` (matrix), plus individual provider docs (`claude.md`, `codex.md`, `cursor.md`, etc.)
- **CLI**: `cli.md`, `codex-oauth.md`
- **Troubleshooting**: `KEYCHAIN_FIX.md`, `TODO.md` (upstream maintenance), `web-integration.md` (deprecated)
- **Technical reports**: `perf-energy-issue-139-*.md`, `claude-comparison-since-0.18.0beta2.md`
- **Refactoring**: `refactor/cli.md`, `refactor/macros.md`
