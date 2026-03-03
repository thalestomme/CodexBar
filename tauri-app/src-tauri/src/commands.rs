use crate::cli_bridge::{self, ProviderPayload};
use crate::settings::{self, AppSettings};
use tauri::State;
use tokio::sync::Mutex;

pub struct UsageState(pub Mutex<Vec<ProviderPayload>>);

#[tauri::command]
pub async fn fetch_usage(
    state: State<'_, UsageState>,
) -> Result<Vec<ProviderPayload>, String> {
    let app_settings = settings::load_settings();
    let result = cli_bridge::fetch_usage_from_cli(
        app_settings.cli_path.as_deref(),
        &app_settings.enabled_providers,
        &app_settings.provider_tokens,
    )
    .await?;
    *state.0.lock().await = result.clone();
    Ok(result)
}

#[tauri::command]
pub async fn get_cached_usage(
    state: State<'_, UsageState>,
) -> Result<Vec<ProviderPayload>, String> {
    Ok(state.0.lock().await.clone())
}

#[tauri::command]
pub fn get_settings() -> Result<AppSettings, String> {
    Ok(settings::load_settings())
}

#[tauri::command]
pub fn save_settings(settings: AppSettings) -> Result<(), String> {
    settings::save_settings(&settings)
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}
