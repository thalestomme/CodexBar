import type { ProviderPayload } from "../types";

/** Known dashboard/status URLs per provider. */
const PROVIDER_URLS: Record<string, { dashboard?: string; status?: string }> = {
  claude: {
    dashboard: "https://claude.ai/settings/usage",
    status: "https://status.anthropic.com",
  },
  codex: {
    dashboard: "https://app.codex.ai/settings/usage",
  },
  cursor: {
    dashboard: "https://www.cursor.com/settings",
    status: "https://status.cursor.com",
  },
  copilot: {
    dashboard: "https://github.com/settings/copilot",
    status: "https://www.githubstatus.com",
  },
  gemini: {
    dashboard: "https://aistudio.google.com/apikey",
  },
  chatgpt: {
    dashboard: "https://chatgpt.com/settings",
  },
  openrouter: {
    dashboard: "https://openrouter.ai/credits",
  },
};

/** Render action links at the bottom of a provider card. */
export function renderActionLinks(
  container: HTMLElement,
  payload: ProviderPayload,
): void {
  const urls = PROVIDER_URLS[payload.provider.toLowerCase()];
  const statusUrl = payload.status?.url;

  if (!urls && !statusUrl) return;

  const links = document.createElement("div");
  links.className = "action-links";

  if (urls?.dashboard) {
    links.appendChild(makeLink("Usage Dashboard", urls.dashboard));
  }

  const finalStatusUrl = statusUrl ?? urls?.status;
  if (finalStatusUrl) {
    links.appendChild(makeLink("Status Page", finalStatusUrl));
  }

  container.appendChild(links);
}

function makeLink(label: string, url: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "action-link";
  a.href = url;
  a.textContent = label;
  a.target = "_blank";
  a.rel = "noopener";
  // Tauri shell plugin opens URLs in the default browser
  a.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      const { open } = await import("@tauri-apps/plugin-shell");
      await open(url);
    } catch {
      window.open(url, "_blank");
    }
  });
  return a;
}
