import type { CreditsSnapshot, ProviderPayload } from "../types";
import { renderHeader } from "./Header";
import { renderProgressBar } from "./ProgressBar";
import { renderActionLinks } from "./ActionLinks";
import { formatCredits, formatCurrency, windowLabel } from "../utils/format";

/** Providers that support CLI-based auth on Linux. */
const CLI_AUTH_PROVIDERS: Record<string, string> = {
  claude: "claude login",
  codex: "codex auth login",
  gemini: "gemini auth login",
  augment: "auggie login",
  windsurf: "windsurf auth login",
};

/** Providers that are truly macOS-only (browser cookie auth, no CLI alternative). */
const MACOS_ONLY_PROVIDERS = new Set(["cursor", "factory", "ollama"]);

const CREDITS_FULL_SCALE = 1000;

/** Determine color class for credits (inverted: green = lots remaining, red = low). */
function creditsColorClass(remaining: number): string {
  const pct = (remaining / CREDITS_FULL_SCALE) * 100;
  if (pct > 75) return "progress-green";
  if (pct > 25) return "progress-yellow";
  return "progress-red";
}

/** Render a credits progress bar section. */
function renderCreditsBar(container: HTMLElement, credits: CreditsSnapshot): void {
  if (credits.remaining <= 0) return;

  const row = document.createElement("div");
  row.className = "progress-row";

  const header = document.createElement("div");
  header.className = "progress-header";

  const labelEl = document.createElement("span");
  labelEl.className = "progress-label";
  labelEl.textContent = "Credits";

  const statsEl = document.createElement("span");
  statsEl.className = "progress-stats";
  statsEl.textContent = `${formatCredits(credits.remaining)}${String.fromCharCode(160, 160, 160, 160)}1K tokens`;

  header.appendChild(labelEl);
  header.appendChild(statsEl);

  const track = document.createElement("div");
  track.className = "progress-track";

  const fillPct = Math.min(100, (credits.remaining / CREDITS_FULL_SCALE) * 100);
  const fill = document.createElement("div");
  fill.className = `progress-fill ${creditsColorClass(credits.remaining)}`;
  fill.style.width = `${fillPct}%`;

  track.appendChild(fill);
  row.appendChild(header);
  row.appendChild(track);
  container.appendChild(row);
}

/** Render a full provider card into the given container. */
export function renderProviderCard(
  container: HTMLElement,
  payload: ProviderPayload,
): void {
  container.innerHTML = "";

  // Error state
  if (payload.error && !payload.usage) {
    const errorEl = document.createElement("div");
    errorEl.className = "card-error";

    const header = document.createElement("div");
    header.className = "card-error-header";
    header.textContent = `Error fetching ${payload.provider}`;

    const msg = document.createElement("div");
    msg.className = "card-error-message";

    const errMsg = payload.error.message.toLowerCase();
    const isWebError = errMsg.includes("web support") || errMsg.includes("macos") || errMsg.includes("cookie");
    const cliCommand = CLI_AUTH_PROVIDERS[payload.provider];

    if (isWebError && cliCommand) {
      // Provider supports CLI auth — guide the user instead of showing macOS error
      msg.innerHTML = "";
      const text = document.createTextNode("Not authenticated. Run ");
      const code = document.createElement("code");
      code.textContent = cliCommand;
      const suffix = document.createTextNode(" in your terminal");
      msg.appendChild(text);
      msg.appendChild(code);
      msg.appendChild(suffix);
    } else if (isWebError || MACOS_ONLY_PROVIDERS.has(payload.provider)) {
      msg.textContent = "This provider requires macOS (browser cookies)";
    } else {
      msg.textContent = payload.error.message;
    }

    errorEl.appendChild(header);
    errorEl.appendChild(msg);

    // Show hint for credential-related errors
    if (
      !isWebError &&
      (errMsg.includes("auth") ||
      errMsg.includes("token") ||
      errMsg.includes("key") ||
      errMsg.includes("credential") ||
      errMsg.includes("unauthorized") ||
      errMsg.includes("403") ||
      errMsg.includes("401"))
    ) {
      const hint = document.createElement("div");
      hint.className = "card-error-hint";
      hint.textContent = "Check your credentials in Settings";
      errorEl.appendChild(hint);
    }

    container.appendChild(errorEl);
    return;
  }

  if (!payload.usage) {
    const empty = document.createElement("div");
    empty.className = "card-empty";
    empty.textContent = "No usage data available";
    container.appendChild(empty);
    return;
  }

  const card = document.createElement("div");
  card.className = "provider-card";

  // Header
  renderHeader(card, payload);

  // Usage bars
  const usage = payload.usage;
  const slots = ["primary", "secondary", "tertiary"] as const;
  for (const slot of slots) {
    const rw = usage[slot];
    if (rw) {
      renderProgressBar(card, windowLabel(slot, payload.provider), rw);
    }
  }

  // Credits bar
  if (payload.credits) {
    renderCreditsBar(card, payload.credits);
  }

  // Provider cost (extra usage)
  if (usage.providerCost) {
    const cost = usage.providerCost;
    const costEl = document.createElement("div");
    costEl.className = "cost-section";

    const period = cost.period ?? "This period";
    const usedStr = formatCurrency(cost.used, cost.currencyCode);
    const limitStr = formatCurrency(cost.limit, cost.currencyCode);
    const pct = cost.limit > 0 ? Math.round((cost.used / cost.limit) * 100) : 0;

    costEl.textContent = `${period}: ${usedStr} / ${limitStr} — ${pct}% used`;
    card.appendChild(costEl);
  }

  // Status indicator
  if (payload.status && payload.status.indicator !== "none") {
    const statusEl = document.createElement("div");
    statusEl.className = `status-indicator status-${payload.status.indicator}`;
    statusEl.textContent = payload.status.description ?? payload.status.indicator;
    card.appendChild(statusEl);
  }

  // Action links
  renderActionLinks(card, payload);

  container.appendChild(card);
}
