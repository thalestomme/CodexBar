import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ProviderPayload } from "./types";
import { renderApp, showContent, showError, showLoading } from "./components/App";
import { renderSettings } from "./components/Settings";

async function fetchAndRender() {
  try {
    const providers = await invoke<ProviderPayload[]>("fetch_usage");
    showContent();
    renderApp(providers);
  } catch (e) {
    showError(String(e));
  }
}

// Wire up footer buttons immediately (synchronous, no async dependency)
document.getElementById("btn-refresh")?.addEventListener("click", async () => {
  showLoading();
  await fetchAndRender();
});

document.getElementById("btn-quit")?.addEventListener("click", async () => {
  await invoke("quit_app");
});

document.getElementById("btn-settings")?.addEventListener("click", () => {
  const contentEl = document.getElementById("content")!;
  const settingsEl = document.getElementById("settings")!;

  // Toggle: if settings is already visible, hide it
  if (!settingsEl.hidden) {
    settingsEl.hidden = true;
    contentEl.hidden = false;
    return;
  }

  contentEl.hidden = true;
  settingsEl.hidden = false;

  renderSettings(settingsEl, async () => {
    settingsEl.hidden = true;
    contentEl.hidden = false;
    showLoading();
    await fetchAndRender();
  });
});

// Async setup: initial fetch + background event listeners
async function setup() {
  await fetchAndRender();

  listen<ProviderPayload[]>("usage-updated", (event) => {
    showContent();
    renderApp(event.payload);
  });

  listen<string>("usage-error", (event) => {
    console.warn("Background refresh error:", event.payload);
  });

  listen("refresh-requested", async () => {
    await fetchAndRender();
  });
}

setup().catch((e) => console.error("Setup failed:", e));
