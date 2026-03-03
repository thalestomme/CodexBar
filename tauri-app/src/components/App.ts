import type { ProviderPayload } from "../types";
import { renderProviderTabs } from "./ProviderTabs";
import { renderProviderCard } from "./ProviderCard";

let activeIndex = 0;
let currentProviders: ProviderPayload[] = [];

/** Full render: tabs + active provider card. */
export function renderApp(providers: ProviderPayload[]): void {
  currentProviders = providers;

  // Clamp active index
  if (activeIndex >= providers.length) activeIndex = 0;

  const tabsEl = document.getElementById("tabs")!;
  const cardEl = document.getElementById("card")!;

  renderProviderTabs(tabsEl, providers, activeIndex, (index) => {
    activeIndex = index;
    renderApp(currentProviders);
  });

  if (providers.length > 0) {
    renderProviderCard(cardEl, providers[activeIndex]);
  } else {
    cardEl.innerHTML =
      '<div class="card-empty">No providers enabled. Click Settings to choose which providers to monitor.</div>';
  }
}

/** Show the content section, hide loading. */
export function showContent(): void {
  document.getElementById("loading")!.hidden = true;
  document.getElementById("error")!.hidden = true;
  document.getElementById("content")!.hidden = false;
}

/** Show an error message. */
export function showError(message: string): void {
  document.getElementById("loading")!.hidden = true;
  const errorEl = document.getElementById("error")!;
  errorEl.hidden = false;
  errorEl.textContent = message;
  document.getElementById("content")!.hidden = true;
}

/** Show loading state. */
export function showLoading(): void {
  document.getElementById("loading")!.hidden = false;
  document.getElementById("error")!.hidden = true;
  document.getElementById("content")!.hidden = true;
}
