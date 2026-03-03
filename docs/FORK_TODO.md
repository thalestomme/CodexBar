# Fork TODO

Living todolist for the CodexBar cross-platform fork. Tracks blockers, portability issues, and planned work.

See also: `docs/architecture.md` for platform support matrix and cross-platform guidelines.

---

## Icon

- [ ] Generate icons from clean `docs/icon.png` (no white border) → all PNG sizes + `.ico` for Windows

---

## Phase 1: Core Parity

What's built vs what's missing to match the macOS app's core functionality.

### Done (for reference)

- Tray icon with popup window, positioned near cursor (Linux/Wayland workarounds)
- Provider tabs with error dot indicators
- Usage progress bars (primary/secondary/tertiary) with color coding (green/yellow/red)
- Reset countdown formatting
- Provider cost display (basic text)
- Account email + org display in header
- Status indicators (minor/major/critical/maintenance)
- Settings panel: enable/disable providers, API key entry, auth-type guidance
- Background auto-refresh (5-minute loop via CLI)
- Dark/light mode (prefers-color-scheme)
- Error states with auth guidance (CLI commands, macOS-only badges)
- 29 providers listed with correct auth types
- CLI bridge with per-provider source overrides for Linux
- Blur-to-dismiss popup
- KWin D-Bus monitor detection fallback

### Frontend Gaps

- [ ] Render credits section (Codex) — types exist in `types.ts` and `cli_bridge.rs`, `ProviderCard.ts` never renders `credits` field
- [ ] Add action links for remaining providers — only 7 of ~29 have dashboard/status URLs in `ActionLinks.ts`
- [ ] Provider-specific window labels — only Claude has custom labels ("Session"/"Weekly"/"Sonnet"); others show generic "Primary"/"Secondary"/"Tertiary". Data comes from CLI's `resetDescription` field
- [ ] Surface background refresh errors to user — `"usage-error"` event only logs to `console.warn` in `main.ts`
- [ ] Add provider icons/logos — no brand icons exist (macOS has `ProviderBrandIcon.swift` with 28x28 branded icons)
- [ ] Add "last refreshed" global indicator — only per-provider `updatedAt` inside card, no overall timestamp

### Settings Gaps

- [ ] Refresh interval control — `refresh_interval_secs` exists in `settings.rs` struct but Settings UI has no control for it
- [ ] CLI path override control — `cli_path` exists in settings struct but no UI field
- [ ] Show-as-used toggle (bars fill as consumed vs remaining) — macOS has this, Tauri doesn't
- [ ] Reset time format toggle (countdown vs absolute clock) — macOS has this, Tauri doesn't
- [ ] Provider ordering (drag-to-reorder) — macOS has draggable sidebar list
- [ ] Hide personal info toggle (redact emails) — macOS has this

### Rust Backend Gaps

- [ ] `cli_bridge.rs:101` — CLI binary naming doesn't handle `.exe` (Windows)
- [ ] `cli_bridge.rs:134` — `linux_source_override()` function name is misleading, applies to all non-macOS
- [ ] `kimi` provider missing from `linux_source_override()` — gets `--source auto` which may not work
- [ ] No `"refresh-requested"` event emitter — frontend listens for it but nothing in Rust emits it
- [ ] Tray icon is static — uses `app.default_window_icon()`, not a dynamic usage indicator

---

## Phase 2: Polish & UX

- [ ] OS notifications for quota depletion/restoration — macOS fires system notifications via `UNUserNotificationCenter`; Tauri has `tauri-plugin-notification` available
- [ ] Error display with copy-to-clipboard — macOS has expandable error blocks with copy button
- [ ] Pace indicator on progress bars — macOS shows a ghost/secondary fill showing expected vs actual usage
- [ ] Separate preferences window (vs inline panel) — current settings is a flat panel inside the popup; macOS has a multi-pane window (General/Display/Providers/Advanced/About)
- [ ] Launch at login / autostart — macOS has `LaunchAtLoginManager`; Tauri has `tauri-plugin-autostart`
- [ ] Global keyboard shortcut to open popup — macOS has a configurable hotkey; Tauri has `tauri-plugin-global-shortcut`

---

## Phase 3: Distribution

- [ ] Sidecar setup — bundle CLI binary so users don't need Swift installed
- [ ] CI/CD for Tauri app — only Swift CI exists from upstream
- [ ] Auto-release workflow (GitHub releases with platform binaries)
- [ ] `tauri.conf.json` — add `.ico` icon for Windows bundling
- [ ] Auto-update mechanism — Sparkle equivalent; Tauri has `tauri-plugin-updater`

---

## Research Needed

- [ ] Credential storage on Linux — OAuth tokens stored as plain JSON in `~/.config/codexbar-tauri/settings.json`; investigate libsecret/Secret Service for better UX
- [ ] Swift on Windows — does the CodexBarCLI dependency chain build on Windows?
- [ ] Tauri sidecar integration — how to bundle the CLI binary
- [ ] Browser cookie access on Linux — low priority, API/OAuth/CLI covers most use cases

---

## macOS-Specific (intentionally skipped)

These macOS app features won't be replicated in Tauri:

- Dynamic pixel-rendered tray icon (critter bar chart) — too platform-specific; static icon is fine
- WidgetKit extension — macOS only
- Sparkle auto-updates — replaced by `tauri-plugin-updater`
- Keychain integration — replaced by platform-appropriate credential storage
- Browser cookie import (SweetCookieKit) — macOS only, providers fail gracefully
- NSMenu-embedded SwiftUI cards — replaced by HTML popup
- Charts (credits history, cost history, usage breakdown) — defer, complex and low priority

---

## Swift Backend — Platform Portability Status

The upstream Swift code is **well-architected for cross-platform**. All macOS-specific code is properly gated with `#if os(macOS)` or `#if canImport(Darwin)` at file or block level. The CLI builds cleanly on Linux with no hacks or workarounds. This section documents the gating for reference — these are upstream concerns, not things we need to fix.

### How macOS-only code is gated

**SweetCookieKit** (browser cookies) — Dependency of CodexBarCore, but compiles to an **empty module** on Linux (every source file wrapped in `#if os(macOS)`). CodexBarCore provides Linux stubs in `BrowserCookieImportOrder.swift` (`#else` branch defines an empty `Browser` struct). 18 files use it; 14 correctly gate the import, 4 have bare `import SweetCookieKit` that is harmless (imports nothing on Linux), 1 uses `#if canImport`.

**Keychain / Security framework** (12+ files) — `KeychainNoUIQuery`, `KeychainAccessPreflight`, `KeychainCacheStore`, `KeychainAccessGate`, `ClaudeOAuth/*.swift`. All gated `#if os(macOS)`. On Linux, OAuth tokens are read from token files instead.

**WebKit / web scraping** (9 files) — All 6 files in `OpenAIWeb/` are entirely `#if os(macOS)`. `ClaudeWebAPIFetcher.swift` gates cookie usage. Uses `import WebKit, AppKit`.

**AppKit** (6+ files) — Augment provider files (`AugmentSessionKeepalive.swift`, etc.), window management, notifications. All gated.

**Darwin syscalls** (6 files) — `TTYCommandRunner.swift`, `SubprocessRunner.swift`, `ClaudeCLISession.swift`, `CodexCLISession.swift`. Use `#if canImport(Darwin)` with `#else import Glibc` — **these work on Linux** via the Glibc fallback.

**CLI catch-all** — `CLIUsageCommand.swift` has a `#if !os(macOS)` guard that intercepts any web-source request and returns a clean error message before it reaches provider code.

### What works on Linux

- CLI builds and runs cleanly (`swift build --product CodexBarCLI`)
- 14 of 20+ providers fully functional via API token/OAuth/CLI strategies
- 7 web-only providers fail gracefully with clear error messages
- `FoundationNetworking` imports properly gated (~25 files)
- OSLog falls back to JSON logging
- PTY/subprocess runners work via Glibc
- JetBrains provider has a regex-based XML parser fallback (since `XMLDocument` is macOS-only)
- `BrowserDetection` / `BrowserCookieAccessGate` have no-op `#else` stubs

### Not a problem (previously flagged as concerns)

- **SweetCookieKit as dependency** — It compiles to nothing on Linux. No action needed.
- **Sparkle / KeyboardShortcuts** — Only linked by the macOS app target, gated in `Package.swift` `#if os(macOS)`. Never resolved on Linux.
- **Darwin PTY code** — Has working `#else import Glibc` branches. Works on Linux.

---

## Completed

<!-- Track completed items here -->
