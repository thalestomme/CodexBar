use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::time::Duration;
use tokio::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderPayload {
    pub provider: String,
    pub account: Option<String>,
    pub version: Option<String>,
    pub source: String,
    pub status: Option<ProviderStatusPayload>,
    pub usage: Option<UsageSnapshot>,
    pub credits: Option<CreditsSnapshot>,
    pub error: Option<ProviderErrorPayload>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatusPayload {
    pub indicator: String,
    pub description: Option<String>,
    pub updated_at: Option<String>,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshot {
    pub primary: Option<RateWindow>,
    pub secondary: Option<RateWindow>,
    pub tertiary: Option<RateWindow>,
    pub provider_cost: Option<ProviderCostSnapshot>,
    pub updated_at: Option<String>,
    pub account_email: Option<String>,
    pub account_organization: Option<String>,
    pub login_method: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RateWindow {
    pub used_percent: f64,
    pub window_minutes: Option<i64>,
    pub resets_at: Option<String>,
    pub reset_description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderCostSnapshot {
    pub used: f64,
    pub limit: f64,
    pub currency_code: String,
    pub period: Option<String>,
    pub resets_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditsSnapshot {
    pub remaining: f64,
    pub events: Vec<CreditEvent>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreditEvent {
    pub id: String,
    pub date: String,
    pub service: String,
    pub credits_used: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderErrorPayload {
    pub code: i32,
    pub message: String,
    pub kind: Option<String>,
}

/// Resolve the path to the codexbar CLI binary.
/// Priority: settings override → repo .build → PATH lookup.
pub fn resolve_cli_path(settings_path: Option<&str>) -> Option<PathBuf> {
    // 1. User-configured path
    if let Some(p) = settings_path {
        let path = PathBuf::from(p);
        if path.exists() {
            return Some(path);
        }
    }

    // 2. Repo build directory (release then debug)
    let repo_root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../..");
    for profile in ["release", "debug"] {
        let candidate = repo_root.join(format!(".build/{}/CodexBarCLI", profile));
        if candidate.exists() {
            return Some(candidate);
        }
    }

    // 3. PATH lookup
    which_in_path("codexbar")
}

fn which_in_path(name: &str) -> Option<PathBuf> {
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .map(|dir| dir.join(name))
            .find(|p| p.exists())
    })
}

/// Map provider ID to the environment variable name the CLI expects.
fn provider_env_var(provider_id: &str) -> Option<&'static str> {
    match provider_id {
        "openrouter" => Some("OPENROUTER_API_KEY"),
        "copilot" => Some("COPILOT_API_TOKEN"),
        "kilo" => Some("KILO_API_KEY"),
        "minimax" => Some("MINIMAX_API_KEY"),
        "warp" => Some("WARP_API_KEY"),
        "kimi" => Some("KIMI_AUTH_TOKEN"),
        _ => None,
    }
}

/// On non-macOS, `--source auto` tries web/cookie auth first and fails.
/// This maps each provider to its best platform-agnostic source.
#[cfg(not(target_os = "macos"))]
fn linux_source_override(provider_id: &str) -> Option<&'static str> {
    match provider_id {
        "claude" => Some("oauth"),
        "codex" | "augment" | "kilo" | "jetbrains" => Some("cli"),
        "gemini" | "copilot" | "openrouter" | "minimax" | "warp" => Some("api"),
        _ => None,
    }
}

#[cfg(target_os = "macos")]
fn linux_source_override(_provider_id: &str) -> Option<&'static str> {
    None
}

/// Run a single CLI invocation and parse JSON output lines into payloads.
async fn run_cli(
    binary: &PathBuf,
    providers: &[&str],
    source: Option<&str>,
    provider_tokens: &HashMap<String, String>,
) -> Result<Vec<ProviderPayload>, String> {
    let provider_arg = providers.join(",");

    let mut cmd = Command::new(binary);
    cmd.args(["usage", "--provider", &provider_arg, "--format", "json"]);

    if let Some(src) = source {
        cmd.args(["--source", src]);
    }

    // Unset CLAUDECODE to avoid nested-session detection when probing Claude
    cmd.env_remove("CLAUDECODE");

    // Inject stored API keys as environment variables
    for (provider_id, token) in provider_tokens {
        if let Some(env_name) = provider_env_var(provider_id) {
            cmd.env(env_name, token);
        }
    }

    let output = tokio::time::timeout(Duration::from_secs(30), cmd.output())
        .await
        .map_err(|_| "CLI timed out after 30 seconds".to_string())?
        .map_err(|e| format!("Failed to spawn CLI: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results: Vec<ProviderPayload> = Vec::new();
    for line in stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if let Ok(mut batch) = serde_json::from_str::<Vec<ProviderPayload>>(trimmed) {
            results.append(&mut batch);
        }
    }

    if !results.is_empty() {
        return Ok(results);
    }

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "CLI exited with {}: {}",
            output.status.code().unwrap_or(-1),
            stderr.trim()
        ));
    }

    Ok(results)
}

/// Spawn the codexbar CLI and parse JSON output.
/// If `enabled_providers` is empty, returns an empty vec without calling the CLI.
/// `provider_tokens` maps provider IDs to credential values that are injected as
/// environment variables into the CLI process.
///
/// On Linux, providers that need a specific `--source` (e.g. Claude needs `oauth`)
/// are split into separate CLI invocations.
pub async fn fetch_usage_from_cli(
    cli_path: Option<&str>,
    enabled_providers: &[String],
    provider_tokens: &HashMap<String, String>,
) -> Result<Vec<ProviderPayload>, String> {
    if enabled_providers.is_empty() {
        return Ok(vec![]);
    }

    let binary = resolve_cli_path(cli_path)
        .ok_or_else(|| "CodexBar CLI not found. Run `npm run build:cli` or install Swift and build with `swift build --product CodexBarCLI`.".to_string())?;

    // Group providers by their source override
    let mut default_providers: Vec<&str> = Vec::new();
    let mut by_source: HashMap<&str, Vec<&str>> = HashMap::new();

    for id in enabled_providers {
        if let Some(source) = linux_source_override(id) {
            by_source.entry(source).or_default().push(id.as_str());
        } else {
            default_providers.push(id.as_str());
        }
    }

    let mut all_results: Vec<ProviderPayload> = Vec::new();

    // Run default providers (no --source override)
    if !default_providers.is_empty() {
        match run_cli(&binary, &default_providers, None, provider_tokens).await {
            Ok(mut r) => all_results.append(&mut r),
            Err(e) => eprintln!("CLI error (default source): {}", e),
        }
    }

    // Run providers that need a specific --source
    for (source, providers) in &by_source {
        match run_cli(&binary, providers, Some(source), provider_tokens).await {
            Ok(mut r) => all_results.append(&mut r),
            Err(e) => eprintln!("CLI error (source={}): {}", source, e),
        }
    }

    Ok(all_results)
}
