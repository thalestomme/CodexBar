use tauri::{AppHandle, Manager, PhysicalPosition, Rect};

/// Query KDE KWin for the name of the output (monitor) where the cursor currently is.
/// Uses `qdbus` to call `org.kde.KWin.activeOutputName()` over D-Bus.
/// Returns `None` on non-KDE desktops or if the call fails.
#[cfg(target_os = "linux")]
fn query_active_output_name() -> Option<String> {
    let output = std::process::Command::new("qdbus")
        .args(["org.kde.KWin", "/KWin", "org.kde.KWin.activeOutputName"])
        .output()
        .ok()?;

    if !output.status.success() {
        eprintln!("[window] qdbus activeOutputName call failed (status {})", output.status);
        return None;
    }

    let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if name.is_empty() {
        None
    } else {
        Some(name)
    }
}

/// Toggle popup window visibility, positioning it near the tray icon.
///
/// `tray_rect` comes from `TrayIconEvent::Click` (macOS/Windows only).
/// On Linux, this is `None` and we fall back through: cursor position →
/// KWin active output D-Bus query → center on largest monitor.
pub fn toggle_popup(app: &AppHandle, tray_rect: Option<Rect>) {
    let Some(window) = app.get_webview_window("main") else {
        eprintln!("[window] No 'main' webview window found");
        return;
    };

    if window.is_visible().unwrap_or(false) {
        eprintln!("[window] Hiding popup");
        let _ = window.hide();
        return;
    }

    eprintln!("[window] toggle_popup called, tray_rect={:?}", tray_rect);

    let scale = window.scale_factor().unwrap_or(1.0);
    let win_w = 340.0 * scale;
    let win_h = 520.0 * scale;

    let monitors: Vec<_> = window.available_monitors().unwrap_or_default();
    eprintln!("[window] Available monitors: {}", monitors.len());
    for (i, m) in monitors.iter().enumerate() {
        eprintln!("[window]   monitor[{}]: pos=({}, {}), size={}x{}, scale={}, name={:?}",
            i, m.position().x, m.position().y,
            m.size().width, m.size().height,
            m.scale_factor(), m.name());
    }

    // Get cursor position — with GDK_BACKEND=x11 this returns valid coordinates
    // near the tray icon, but possibly on the wrong monitor (XWayland clamps).
    let cursor = tray_rect
        .map(|r| {
            let pos = r.position.to_physical::<f64>(1.0);
            let size = r.size.to_physical::<f64>(1.0);
            let c = (pos.x + size.width / 2.0, pos.y + size.height / 2.0);
            eprintln!("[window] Using tray rect anchor: {:?}", c);
            c
        })
        .or_else(|| {
            match app.cursor_position() {
                Ok(pos) if pos.x != 0.0 || pos.y != 0.0 => {
                    eprintln!("[window] Cursor position: ({}, {})", pos.x, pos.y);
                    Some((pos.x, pos.y))
                }
                Ok(_) => {
                    eprintln!("[window] Cursor position is (0,0)");
                    None
                }
                Err(e) => {
                    eprintln!("[window] Failed to get cursor position: {}", e);
                    None
                }
            }
        });

    // Find the XWayland monitor the cursor lands on (may be wrong monitor)
    let xwayland_monitor = cursor.and_then(|(cx, cy)| {
        monitors.iter().find(|m| {
            let mp = m.position();
            let ms = m.size();
            cx >= mp.x as f64
                && cx < (mp.x as f64 + ms.width as f64)
                && cy >= mp.y as f64
                && cy < (mp.y as f64 + ms.height as f64)
        })
    });

    // On Linux, ask KWin which monitor the cursor is ACTUALLY on.
    // With GDK_BACKEND=x11, Tauri reports connector names (DP-1, DP-2)
    // that match KWin's output names, so we can match directly by name.
    #[cfg(target_os = "linux")]
    let kwin_monitor = query_active_output_name().and_then(|output_name| {
        eprintln!("[window] KWin activeOutputName: \"{}\"", output_name);
        let matched = monitors.iter().find(|m| {
            m.name().as_deref() == Some(&output_name)
        });
        if let Some(m) = matched {
            eprintln!("[window] KWin output \"{}\" matched to Tauri monitor {:?}", output_name, m.name());
        } else {
            eprintln!("[window] KWin output \"{}\" not found in Tauri monitors", output_name);
        }
        matched
    });

    #[cfg(not(target_os = "linux"))]
    let kwin_monitor: Option<&tauri::Monitor> = None;

    // Determine which monitor to use: prefer KWin (correct on Wayland),
    // fall back to XWayland monitor, then largest monitor.
    let target_monitor = kwin_monitor
        .or(xwayland_monitor)
        .or_else(|| monitors.iter().max_by_key(|m| (m.size().width as u64) * (m.size().height as u64)));

    let Some(target) = target_monitor else {
        eprintln!("[window] No monitors found, cannot position popup");
        let _ = window.show();
        let _ = window.set_focus();
        return;
    };

    let mon_x = target.position().x as f64;
    let mon_y = target.position().y as f64;
    let mon_w = target.size().width as f64;
    let mon_h = target.size().height as f64;

    eprintln!("[window] Target monitor: {:?} pos=({}, {}), size={}x{}",
        target.name(), mon_x, mon_y, mon_w, mon_h);

    // Check if cursor is on the same monitor KWin identified.
    // XWayland clamps cursor coords to one monitor, so when the real cursor
    // is on a different Wayland monitor the position is meaningless.
    let cursor_on_target = cursor.is_some()
        && xwayland_monitor.is_some()
        && std::ptr::eq(target, xwayland_monitor.unwrap());

    let (x, y) = if cursor_on_target {
        // Cursor is on the correct monitor — use it directly for near-tray positioning
        let (cx, cy) = cursor.unwrap();
        let x = f64::min(
            f64::max(cx - win_w / 2.0, mon_x),
            mon_x + mon_w - win_w,
        );
        let y = if cy < mon_y + mon_h / 2.0 {
            cy + 8.0
        } else {
            f64::max(cy - win_h - 8.0, mon_y)
        };
        eprintln!("[window] Cursor on correct monitor, positioning near cursor");
        (x, y)
    } else {
        // Cursor on wrong monitor or unavailable — position at bottom-right
        // of the correct monitor (where KDE system tray typically sits),
        // with a 48px offset from bottom to account for the panel.
        let x = mon_x + mon_w - win_w - 8.0;
        let y = mon_y + mon_h - win_h - 48.0;
        eprintln!("[window] Cursor on different monitor, using bottom-right of target");
        (x, y)
    };

    eprintln!("[window] Positioning popup at ({}, {})", x as i32, y as i32);
    let _ = window.set_position(tauri::Position::Physical(PhysicalPosition {
        x: x as i32,
        y: y as i32,
    }));

    let _ = window.show();
    let _ = window.set_focus();
}

/// Hide popup on blur (click-away).
pub fn setup_blur_handler(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let window_clone = window.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::Focused(false) = event {
            let _ = window_clone.hide();
        }
    });
}
