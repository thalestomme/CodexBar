import type { ProviderPayload } from "../types";
import { providerDisplayName, formatUpdatedAt } from "../utils/format";

/** Render the provider card header: name, updated time, account info. */
export function renderHeader(
  container: HTMLElement,
  payload: ProviderPayload,
): void {
  const header = document.createElement("div");
  header.className = "card-header";

  const nameRow = document.createElement("div");
  nameRow.className = "card-header-name";

  const name = document.createElement("h2");
  name.className = "provider-name";
  name.textContent = providerDisplayName(payload.provider);

  nameRow.appendChild(name);

  // Account badge
  if (payload.account) {
    const badge = document.createElement("span");
    badge.className = "account-badge";
    badge.textContent = payload.account;
    nameRow.appendChild(badge);
  }

  header.appendChild(nameRow);

  // Updated timestamp
  if (payload.usage?.updatedAt) {
    const updated = document.createElement("div");
    updated.className = "card-updated";
    updated.textContent = formatUpdatedAt(payload.usage.updatedAt);
    header.appendChild(updated);
  }

  // Account info
  const accountParts: string[] = [];
  if (payload.usage?.accountEmail) accountParts.push(payload.usage.accountEmail);
  if (payload.usage?.accountOrganization) accountParts.push(payload.usage.accountOrganization);
  if (accountParts.length > 0) {
    const accountEl = document.createElement("div");
    accountEl.className = "card-account";
    accountEl.textContent = accountParts.join(" · ");
    header.appendChild(accountEl);
  }

  container.appendChild(header);
}
