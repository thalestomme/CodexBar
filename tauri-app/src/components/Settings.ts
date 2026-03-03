import { invoke } from "@tauri-apps/api/core";

interface AppSettings {
  refreshIntervalSecs: number;
  cliPath: string | null;
  enabledProviders: string[];
  providerTokens: Record<string, string>;
}

type ProviderAuthType = "api-key" | "cli" | "auto-detect" | "macos-only";

interface ProviderMeta {
  id: string;
  name: string;
  auth: ProviderAuthType;
  /** For api-key: placeholder text. For cli: the command to run. */
  hint?: string;
}

/** All known providers with auth metadata. */
const ALL_PROVIDERS: ProviderMeta[] = [
  { id: "claude", name: "Claude", auth: "cli", hint: "claude login" },
  { id: "codex", name: "Codex", auth: "cli", hint: "codex auth login" },
  { id: "cursor", name: "Cursor", auth: "macos-only" },
  { id: "copilot", name: "Copilot", auth: "api-key", hint: "Paste token from GitHub settings" },
  { id: "gemini", name: "Gemini", auth: "cli", hint: "gemini auth login" },
  { id: "augment", name: "Augment", auth: "cli", hint: "auggie login" },
  { id: "kilo", name: "Kilo", auth: "api-key", hint: "Paste API key from Kilo dashboard" },
  { id: "openrouter", name: "OpenRouter", auth: "api-key", hint: "Paste key from openrouter.ai/keys" },
  { id: "windsurf", name: "Windsurf", auth: "cli", hint: "windsurf auth login" },
  { id: "bolt", name: "Bolt", auth: "api-key", hint: "Paste API key" },
  { id: "lovable", name: "Lovable", auth: "api-key", hint: "Paste API key" },
  { id: "v0", name: "v0", auth: "api-key", hint: "Paste API key" },
  { id: "chatgpt", name: "ChatGPT", auth: "api-key", hint: "Paste API key" },
  { id: "grok", name: "Grok", auth: "api-key", hint: "Paste API key" },
  { id: "perplexity", name: "Perplexity", auth: "api-key", hint: "Paste API key" },
  { id: "aider", name: "Aider", auth: "cli", hint: "aider --auth" },
  { id: "roo", name: "Roo", auth: "api-key", hint: "Paste API key" },
  { id: "cline", name: "Cline", auth: "api-key", hint: "Paste API key" },
  { id: "antigravity", name: "Antigravity", auth: "api-key", hint: "Paste API key" },
  { id: "zed", name: "Zed", auth: "auto-detect" },
  { id: "devin", name: "Devin", auth: "api-key", hint: "Paste API key" },
  { id: "minimax", name: "MiniMax", auth: "api-key", hint: "Paste API key" },
  { id: "zai", name: "Zai", auth: "api-key", hint: "Paste API key" },
  { id: "factory", name: "Factory", auth: "macos-only" },
  { id: "ollama", name: "Ollama", auth: "macos-only" },
  { id: "jetbrains", name: "JetBrains", auth: "auto-detect" },
  { id: "kimi", name: "Kimi", auth: "api-key", hint: "Paste JWT from Kimi session" },
  { id: "warp", name: "Warp", auth: "api-key", hint: "Paste API key or token" },
];

let selectedProviders: Set<string> = new Set();
let providerTokens: Record<string, string> = {};

function createSetupRow(provider: ProviderMeta): HTMLElement | null {
  const row = document.createElement("div");
  row.className = "provider-setup-row";

  switch (provider.auth) {
    case "api-key": {
      const input = document.createElement("input");
      input.type = "password";
      input.className = "provider-token-input";
      input.placeholder = provider.hint ?? "Paste API key";
      input.value = providerTokens[provider.id] ?? "";
      input.addEventListener("input", () => {
        const val = input.value.trim();
        if (val) {
          providerTokens[provider.id] = val;
        } else {
          delete providerTokens[provider.id];
        }
      });
      row.appendChild(input);
      break;
    }
    case "cli": {
      const hint = document.createElement("div");
      hint.className = "provider-setup-hint";

      const text = document.createElement("span");
      text.textContent = `Run `;

      const code = document.createElement("code");
      code.textContent = provider.hint ?? "";

      const suffix = document.createElement("span");
      suffix.textContent = " in your terminal";

      const copyBtn = document.createElement("button");
      copyBtn.className = "provider-copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(provider.hint ?? "");
        } catch {
          // Ignore clipboard errors
        }
        copyBtn.textContent = "Copied!";
        setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
      });

      hint.appendChild(text);
      hint.appendChild(code);
      hint.appendChild(suffix);
      hint.appendChild(copyBtn);
      row.appendChild(hint);
      break;
    }
    case "auto-detect": {
      const note = document.createElement("div");
      note.className = "provider-setup-hint";
      note.textContent = "Detected automatically — no setup needed.";
      row.appendChild(note);
      break;
    }
    case "macos-only": {
      const note = document.createElement("div");
      note.className = "provider-setup-hint provider-macos-hint";
      note.textContent = "Requires macOS (browser cookies)";
      row.appendChild(note);
      break;
    }
    default:
      return null;
  }

  return row;
}

export async function renderSettings(
  container: HTMLElement,
  onClose: () => void,
): Promise<void> {
  // Load current settings
  const settings = await invoke<AppSettings>("get_settings");
  selectedProviders = new Set(settings.enabledProviders);
  providerTokens = { ...settings.providerTokens };

  container.innerHTML = "";

  // Header
  const header = document.createElement("div");
  header.className = "settings-header";
  header.innerHTML = `<h2 class="settings-title">Providers</h2>
    <p class="settings-subtitle">Select the providers you want to monitor</p>`;
  container.appendChild(header);

  // Provider list (single column for setup rows)
  const list = document.createElement("div");
  list.className = "settings-provider-list";

  for (const provider of ALL_PROVIDERS) {
    const item = document.createElement("div");
    item.className = "settings-provider-item";

    const toggle = document.createElement("label");
    toggle.className = "settings-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedProviders.has(provider.id);

    const span = document.createElement("span");
    span.className = "settings-toggle-label";
    span.textContent = provider.name;

    if (provider.auth === "macos-only") {
      const badge = document.createElement("span");
      badge.className = "provider-macos-badge";
      badge.textContent = "macOS only";
      span.appendChild(badge);
    }

    toggle.appendChild(checkbox);
    toggle.appendChild(span);
    item.appendChild(toggle);

    // Setup row (shown when checked)
    const setupRow = createSetupRow(provider);
    if (setupRow) {
      setupRow.hidden = !checkbox.checked;
      item.appendChild(setupRow);
    }

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedProviders.add(provider.id);
      } else {
        selectedProviders.delete(provider.id);
      }
      if (setupRow) {
        setupRow.hidden = !checkbox.checked;
      }
    });

    list.appendChild(item);
  }

  container.appendChild(list);

  // Buttons
  const buttons = document.createElement("div");
  buttons.className = "settings-buttons";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "settings-btn settings-btn-cancel";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", onClose);

  const saveBtn = document.createElement("button");
  saveBtn.className = "settings-btn settings-btn-save";
  saveBtn.textContent = "Save";
  saveBtn.addEventListener("click", async () => {
    settings.enabledProviders = [...selectedProviders];
    settings.providerTokens = { ...providerTokens };
    await invoke("save_settings", { settings });
    onClose();
  });

  buttons.appendChild(cancelBtn);
  buttons.appendChild(saveBtn);
  container.appendChild(buttons);
}
