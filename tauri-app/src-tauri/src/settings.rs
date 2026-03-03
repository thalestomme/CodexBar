use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    #[serde(default = "default_refresh_interval")]
    pub refresh_interval_secs: u64,
    pub cli_path: Option<String>,
    #[serde(default)]
    pub enabled_providers: Vec<String>,
    #[serde(default)]
    pub provider_tokens: HashMap<String, String>,
}

fn default_refresh_interval() -> u64 {
    300
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            refresh_interval_secs: default_refresh_interval(),
            cli_path: None,
            enabled_providers: vec![],
            provider_tokens: HashMap::new(),
        }
    }
}

fn settings_path() -> PathBuf {
    let config_dir = dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("~/.config"))
        .join("codexbar-tauri");
    config_dir.join("settings.json")
}

pub fn load_settings() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write settings: {}", e))
}
