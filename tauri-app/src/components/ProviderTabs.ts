import type { ProviderPayload } from "../types";
import { providerDisplayName } from "../utils/format";

export type TabChangeCallback = (index: number) => void;

/** Render horizontal provider tabs into the given container. */
export function renderProviderTabs(
  container: HTMLElement,
  providers: ProviderPayload[],
  activeIndex: number,
  onChange: TabChangeCallback,
): void {
  container.innerHTML = "";
  container.className = "provider-tabs";

  providers.forEach((p, i) => {
    const tab = document.createElement("button");
    tab.className = `tab${i === activeIndex ? " tab-active" : ""}`;
    tab.type = "button";

    const name = document.createElement("span");
    name.className = "tab-name";
    name.textContent = providerDisplayName(p.provider);
    tab.appendChild(name);

    // Error dot
    if (p.error && !p.usage) {
      const dot = document.createElement("span");
      dot.className = "tab-error-dot";
      dot.title = "Error";
      tab.appendChild(dot);
    }

    tab.addEventListener("click", () => onChange(i));
    container.appendChild(tab);
  });
}
