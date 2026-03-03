import type { RateWindow } from "../types";
import { formatPercent, formatResetCountdown } from "../utils/format";

/** Determine color class based on remaining capacity. */
function colorClass(usedPercent: number): string {
  if (usedPercent < 25) return "progress-green";
  if (usedPercent < 75) return "progress-yellow";
  return "progress-red";
}

/**
 * Render a progress bar row with label, percentage, and reset countdown.
 */
export function renderProgressBar(
  container: HTMLElement,
  label: string,
  window: RateWindow,
): void {
  const row = document.createElement("div");
  row.className = "progress-row";

  const header = document.createElement("div");
  header.className = "progress-header";

  const labelEl = document.createElement("span");
  labelEl.className = "progress-label";
  labelEl.textContent = label;

  const statsEl = document.createElement("span");
  statsEl.className = "progress-stats";

  const pctText = `${formatPercent(window.usedPercent)} used`;
  const resetText = window.resetDescription
    ?? (window.resetsAt
      ? `Resets in ${formatResetCountdown(window.resetsAt)}`
      : "");
  statsEl.textContent = resetText ? `${pctText} · ${resetText}` : pctText;

  header.appendChild(labelEl);
  header.appendChild(statsEl);

  const track = document.createElement("div");
  track.className = "progress-track";

  const fill = document.createElement("div");
  fill.className = `progress-fill ${colorClass(window.usedPercent)}`;
  fill.style.width = `${Math.min(100, Math.max(0, window.usedPercent))}%`;

  track.appendChild(fill);
  row.appendChild(header);
  row.appendChild(track);
  container.appendChild(row);
}
