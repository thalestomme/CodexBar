mod cli_bridge;
mod commands;
mod settings;
mod tray;
mod window;

use commands::UsageState;
use tauri::Manager;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(UsageState(Mutex::new(vec![])))
        .setup(|app| {
            // Set up tray icon with menu and click handlers
            tray::setup_tray(app)
                .map_err(|e| -> Box<dyn std::error::Error> { format!("Failed to setup tray: {}", e).into() })?;

            let handle = app.handle().clone();

            // Set up blur-to-dismiss
            window::setup_blur_handler(&handle);

            // Start background refresh timer
            let refresh_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                refresh_loop(refresh_handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::fetch_usage,
            commands::get_cached_usage,
            commands::get_settings,
            commands::save_settings,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CodexBar");
}

async fn refresh_loop(app: tauri::AppHandle) {
    use tauri::Emitter;
    loop {
        let interval = settings::load_settings().refresh_interval_secs;
        tokio::time::sleep(std::time::Duration::from_secs(interval)).await;

        let app_settings = settings::load_settings();
        match cli_bridge::fetch_usage_from_cli(
            app_settings.cli_path.as_deref(),
            &app_settings.enabled_providers,
            &app_settings.provider_tokens,
        ).await {
            Ok(data) => {
                let state = app.state::<UsageState>();
                *state.0.lock().await = data.clone();
                let _ = app.emit("usage-updated", data);
            }
            Err(e) => {
                let _ = app.emit("usage-error", e);
            }
        }
    }
}
