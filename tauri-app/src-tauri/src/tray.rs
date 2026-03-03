use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::App;

use crate::window;

pub fn setup_tray(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "Show CodexBar", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &separator, &quit_item])?;

    TrayIconBuilder::with_id("main-tray")
        .icon(app.default_window_icon().unwrap().clone())
        .tooltip("CodexBar")
        .menu(&menu)
        // On Linux (libayatana-appindicator), left-click must show the menu
        // because on_tray_icon_event never fires. The menu "Show" item
        // triggers the popup using cursor position as the anchor.
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| {
            eprintln!("[tray] Menu event: {:?}", event.id());
            match event.id().as_ref() {
                "show" => {
                    window::toggle_popup(app, None);
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        // This handler fires on macOS/Windows but NOT on Linux (libayatana).
        // Once the ksni migration lands in Tauri, it will fire on Linux too.
        .on_tray_icon_event(|tray, event| {
            eprintln!("[tray] Tray icon event: {:?}", event);
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                rect,
                ..
            } = event
            {
                window::toggle_popup(tray.app_handle(), Some(rect));
            }
        })
        .build(app)?;

    eprintln!("[tray] Tray icon setup complete");
    Ok(())
}
