// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // On Linux Wayland, force X11 (XWayland) backend for GTK so that
    // cursor position queries return real coordinates near the tray icon.
    // KWin D-Bus is then used to identify the correct monitor (since XWayland
    // clamps coordinates to a single display).
    #[cfg(target_os = "linux")]
    {
        use std::env;
        if env::var("WAYLAND_DISPLAY").is_ok() && env::var("GDK_BACKEND").is_err() {
            eprintln!("[main] Wayland detected, forcing GDK_BACKEND=x11 for tray positioning");
            env::set_var("GDK_BACKEND", "x11");
        }
    }

    codexbar_tauri::run()
}
