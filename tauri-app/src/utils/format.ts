/** Format a reset timestamp into a human-readable countdown like "3h 53m". */
export function formatResetCountdown(resetsAt: string | null | undefined): string {
  if (!resetsAt) return "";

  const resetDate = new Date(resetsAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();

  if (diffMs <= 0) return "resetting...";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}

/** Format a percentage, e.g. 2.5 → "3%" */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Format an updatedAt timestamp into a relative time like "Updated 2m ago". */
export function formatUpdatedAt(updatedAt: string | null | undefined): string {
  if (!updatedAt) return "";

  const date = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60000) return "Updated just now";

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Updated ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

/** Format currency, e.g. (12.5, "USD") → "$12.50" */
export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

/** Friendly display name for a provider ID. */
export function providerDisplayName(id: string): string {
  const names: Record<string, string> = {
    claude: "Claude",
    codex: "Codex",
    cursor: "Cursor",
    copilot: "Copilot",
    gemini: "Gemini",
    augment: "Augment",
    kilo: "Kilo",
    openrouter: "OpenRouter",
    windsurf: "Windsurf",
    bolt: "Bolt",
    lovable: "Lovable",
    v0: "v0",
    chatgpt: "ChatGPT",
    grok: "Grok",
    perplexity: "Perplexity",
    aider: "Aider",
    roo: "Roo",
    cline: "Cline",
    antigravity: "Antigravity",
    zed: "Zed",
    devin: "Devin",
    minimax: "MiniMax",
    zai: "Zai",
  };
  return names[id.toLowerCase()] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

/** Format credits remaining, e.g. 542.5 → "542 remaining", 0.5 → "0.5 remaining" */
export function formatCredits(remaining: number): string {
  const display = remaining >= 10 ? Math.round(remaining).toString()
    : remaining >= 1 ? remaining.toFixed(1)
    : remaining.toFixed(2);
  return `${display} remaining`;
}

/** Rate window label by slot. */
export function windowLabel(
  slot: "primary" | "secondary" | "tertiary",
  provider: string,
): string {
  // Most providers use session/weekly/tertiary, but labels can be overridden per-provider
  const labels: Record<string, Record<string, string>> = {
    claude: { primary: "Session", secondary: "Weekly", tertiary: "Sonnet" },
  };
  const providerLabels = labels[provider.toLowerCase()];
  if (providerLabels?.[slot]) return providerLabels[slot];

  const defaults: Record<string, string> = {
    primary: "Primary",
    secondary: "Secondary",
    tertiary: "Tertiary",
  };
  return defaults[slot];
}
