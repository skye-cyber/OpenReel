mod commands;
mod paths;
mod stream_protocol;
mod http_server;
// pub mod state;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use commands::startup::StartupFiles;

// Cross-platform imports — used on desktop, Android, and iOS
use tauri::{AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder, WindowEvent, Emitter};

// Desktop-only imports — tray, menu, and global shortcuts
#[cfg(desktop)]
use tauri::{
  menu::{Menu, MenuItem, PredefinedMenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
#[cfg(desktop)]
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};


/// Cross-platform: the frontend may query it even on mobile.
struct AppState {
  is_quitting: AtomicBool,
}

/// Desktop-only in practice (tray/window icons), but the struct itself
/// is cheap to keep on all platforms so `manage()` doesn't need a guard.
struct IconState {
  path: std::sync::Mutex<PathBuf>,
}

/// Replaces `ipcMain.handle('get-app-version', ...)`
#[tauri::command]
fn get_app_version() -> String {
  env!("CARGO_PKG_VERSION").to_string()
}

/// Replaces `ipcMain.handle('get-dev-status', ...)`
#[tauri::command]
fn get_dev_status() -> bool {
  cfg!(debug_assertions)
}

/* Called by the frontend once React has mounted.
 * Replaces the Electron `did-finish-load` → `mainWindow.show()` logic.
*/
#[tauri::command]
async fn show_main_window(app: AppHandle) -> Result<(), String> {
  if let Some(main) = app.get_webview_window("main") {
    main.show().map_err(|e| e.to_string())?;
    main.set_focus().map_err(|e| e.to_string())?;
  }
  if let Some(splash) = app.get_webview_window("splash") {
    let _ = splash.close();
  }
  Ok(())
}

/*
 * This function only handles the "show after load" logic and the close-to-tray interception.
 *
 * Desktop-only: the close-to-tray interception relies on the tray existing;
 * on mobile, closing the window should just close it.
*/
#[cfg(desktop)]
fn wire_main_window<R: Runtime>(app: &AppHandle<R>) {
  let Some(main) = app.get_webview_window("main") else {
    return;
  };

  // Close main window → hide to tray unless `is_quitting` is set.
  let main_clone = main.clone();
  main.on_window_event(move |event| {
    if let WindowEvent::CloseRequested { api, .. } = event {
      let state = main_clone.app_handle().state::<AppState>();
      if !state.is_quitting.load(Ordering::SeqCst) {
        api.prevent_close();
        let _ = main_clone.hide();
      }
    }
  });
}

/*
 * Resolves the on-disk path to the current app icon. Cross-platform because it only touches the filesystem — no tray/window APIs.
*/
fn resolve_icon_path<R: Runtime>(app: &AppHandle<R>, _dark: bool) -> PathBuf {
  let filename = "openreel.png";

  if cfg!(debug_assertions) {
    std::env::current_dir()
    .unwrap_or_default()
    .join("../assets")
    .join(filename)
  } else {
    app.path()
    .resource_dir()
    .unwrap_or_default()
    .join("assets")
    .join(filename)
  }
}

/*
 * Desktop-only: `TrayIconBuilder`, `Menu`, `MenuItem`, `TrayIconEvent` are all gated behind `#[cfg(all(desktop, feature = "tray-icon"))]`.
*/
#[cfg(desktop)]
fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
  let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
  let sep = PredefinedMenuItem::separator(app)?;
  let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

  let menu = Menu::with_items(app, &[&show_i, &sep, &quit_i])?;

  let icon = tauri::image::Image::from_path(resolve_icon_path(app, false))?;

  let _tray = TrayIconBuilder::with_id("main-tray")
  .icon(icon)
  .tooltip("OpenReel")
  .menu(&menu)
  .show_menu_on_left_click(false)
  .on_menu_event(|app, event| match event.id.as_ref() {
    "show" => {
      if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
      }
    }
    "quit" => {
      app.state::<AppState>()
      .is_quitting
      .store(true, Ordering::SeqCst);
      app.exit(0);
    }
    _ => {}
  })
  .on_tray_icon_event(|tray, event| {
    // Double-click → show main window (Electron's `tray.on('double-click')`)
    if let TrayIconEvent::DoubleClick {
      button: MouseButton::Left,
      ..
    } = event
    {
      let app = tray.app_handle();
      if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
      }
    }
    // Also handle single left-click show (common UX).
    if let TrayIconEvent::Click {
      button: MouseButton::Left,
      button_state: MouseButtonState::Up,
      ..
    } = event
    {
      let app = tray.app_handle();
      if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
      }
    }
  })
  .build(app)?;

  Ok(())
}

/*
 * Desktop-only: `tauri_plugin_global_shortcut` is compiled only on non-mobile targets (see `Cargo.toml`'s target-specific dependency block).
*/
#[cfg(desktop)]
fn register_shortcuts<R: Runtime>(app: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
  // F12 — toggle devtools
  let f12 = Shortcut::new(None, Code::F12);
  app.global_shortcut().on_shortcut(f12, |app, _sc, ev| {
    #[cfg(debug_assertions)]
    if ev.state == ShortcutState::Pressed {
      if let Some(win) = app.get_webview_window("main") {
        {
          if win.is_devtools_open() {
            win.close_devtools();
          } else {
            win.open_devtools();
          }
        }
      }
    }
  })?;

  // Reload — Cmd+R on macOS, Ctrl+R on Windows/Linux
  #[cfg(target_os = "macos")]
  let reload = Shortcut::new(Some(Modifiers::META), Code::KeyR);
  #[cfg(not(target_os = "macos"))]
  let reload = Shortcut::new(Some(Modifiers::CONTROL), Code::KeyR);

  app.global_shortcut().on_shortcut(reload, |app, _sc, ev| {
    if ev.state == ShortcutState::Pressed {
      if let Some(win) = app.get_webview_window("main") {
        let _ = win.eval("window.location.reload()");
      }
    }
  })?;

  // Force reload — Cmd+Shift+R on macOS, Ctrl+Shift+R on Windows/Linux
  #[cfg(target_os = "macos")]
  let force_reload = Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyR);
  #[cfg(not(target_os = "macos"))]
  let force_reload = Shortcut::new(Some(Modifiers::CONTROL | Modifiers::SHIFT), Code::KeyR);

  app.global_shortcut()
  .on_shortcut(force_reload, |app, _sc, ev| {
    if ev.state == ShortcutState::Pressed {
      if let Some(win) = app.get_webview_window("main") {
        let _ = win.eval("window.location.reload()");
      }
    }
  })?;

  // F11 — toggle fullscreen
  let f11 = Shortcut::new(None, Code::F11);
  app.global_shortcut().on_shortcut(f11, |app, _sc, ev| {
    if ev.state == ShortcutState::Pressed {
      if let Some(win) = app.get_webview_window("main") {
        if let Ok(is_fs) = win.is_fullscreen() {
          let _ = win.set_fullscreen(!is_fs);
        }
      }
    }
  })?;

  Ok(())
}

fn make_log_dir() -> PathBuf {
  dirs::home_dir()
  .map(|h| h.join(".openreel").join("logs"))
  .unwrap_or_else(|| std::env::temp_dir().join(".openreel").join("logs"))
}


/*
 * Builds the Tauri app with plugins appropriate for the current platform.
 * The `#[cfg(desktop)]` shadowing pattern is intentional: on mobile, the second `let builder = ...` line is simply not compiled, so the original `builder` value flows through unchanged.
*/
fn build_app() -> tauri::Builder<tauri::Wry> {
  let builder = tauri::Builder::default()
  // MUST be first. Before other plugins, before .manage().
  .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
    // argv[0] is the executable path. Everything after is file args.
    let paths: Vec<String> = argv
    .into_iter()
    .skip(1)
    .filter(|a| !a.starts_with('-'))
    .collect();

    if paths.is_empty() {
      // No file args — just focus the existing window.
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
      }
      return;
    }

    // Store the paths so the frontend can read them when it's ready.
    if let Some(state) = app.try_state::<StartupFiles>() {
      if let Ok(mut pending) = state.paths.lock() {
        pending.extend(paths.clone());
      }
    }

    // Emit an event so the running frontend picks them up immediately.
    let _ = app.emit("single-instance-files", paths);

    // Focus the window.
    if let Some(window) = app.get_webview_window("main") {
      let _ = window.unminimize();
      let _ = window.show();
      let _ = window.set_focus();
    }
  }))
  .plugin(tauri_plugin_opener::init())
  .plugin(tauri_plugin_dialog::init())
  .plugin(tauri_plugin_fs::init())
  .plugin(tauri_plugin_store::Builder::default().build())
  .plugin(tauri_plugin_shell::init())
  .plugin(
    tauri_plugin_log::Builder::new()
    .level(log::LevelFilter::Info)
    .targets([
      // tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
      //   file_name: Some("openreel".into()),
      // }
      tauri_plugin_log::Target::new(
        tauri_plugin_log::TargetKind::Folder {
          path: make_log_dir(),
          file_name: Some("openreel".into()),
        },
      ),
      tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
      tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
    ])
    .max_file_size(2 * 1024 * 1024)  // 2 MB per file
    .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
    .build(),
  );

  #[cfg(desktop)]
  let builder = builder.plugin(tauri_plugin_global_shortcut::Builder::new().build());
  let builder = stream_protocol::register(builder);
  builder
}

/**App entry**/
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  build_app()
  .manage(AppState {
    is_quitting: AtomicBool::new(false),
  })
  .manage(IconState {
    path: std::sync::Mutex::new(PathBuf::new()),
  })
  .manage(commands::library::WatchState {
    watchers: std::sync::Mutex::new(std::collections::HashMap::new()),
  })
  .manage(commands::library::LibraryCache {
    index: std::sync::Mutex::new(None),
    scan_id: std::sync::Mutex::new(None),
  })
  .manage(commands::audio::AudioState {
    selected_device: std::sync::Mutex::new(None),
  })
  .manage(commands::startup::StartupFiles {
    paths: std::sync::Mutex::new(Vec::new()),
  })
  .invoke_handler(tauri::generate_handler![
    get_app_version,
    get_dev_status,
    show_main_window,
    commands::session::mark_session_start,
    commands::session::mark_clean_exit,
    commands::session::is_safe_mode,
    commands::session::get_safe_mode_reason,
    commands::session::enter_safe_mode,
    commands::session::exit_safe_mode,
    commands::session:: get_session_state,
    commands::fs::pick_folder,
    commands::fs::pick_file,
    commands::fs::pick_files,
    commands::shell::open_url,
    commands::shell::open_path,
    commands::shell::check_for_updates,
    commands::system::probe_hardware_decoding,
    commands::system::get_platform_info,
    commands::system::read_log_tail,
    commands::library::scan_folder,
    commands::library::watch_folder,
    commands::library::get_library_meta,
    commands::library::unwatch_folder,
    commands::library::get_library_page,
    commands::library::probe_media_file,
    commands::plugins::fetch_repository,
    commands::settings::read_settings,
    commands::settings::write_settings,
    commands::settings::get_base_dir,
    commands::settings::reset_settings,
    http_server::get_stream_port,
    commands::audio::list_audio_devices,
    commands::audio::set_audio_device,
    commands::audio::get_audio_device,
    commands::startup::get_startup_files,
  ])
    .setup(|app| {
      let handle = app.handle().clone();

      /*
       * skip(1) skips the executable path. On Linux, argv[0] is the binary path. On macOS, argv[0] is also the binary path. On Windows, argv[0] is the exe. argv[1..] are the file paths the OS passes.
       *
       A rgs that aren't file paths. Some launches include flags like --flag or a scheme URL. Filter out anything that starts with -, and treat anything that looks like a path as a file*
       */
      let args: Vec<String> = std::env::args().skip(1).collect();
      if !args.is_empty() {
        if let Some(state) = app.try_state::<commands::startup::StartupFiles>() {
          if let Ok(mut paths) = state.paths.lock() {
            *paths = args;
          }
        }
      }

      let handle_for_server = handle.clone();

      // 1. Start the stream server.
      tauri::async_runtime::spawn(async move {
        match http_server::start().await {
          Ok(addr) => {
            handle_for_server.manage(http_server::ServerAddr(addr.port()));
            log::info!("Stream server port: {}", addr.port());
          }
          Err(e) => log::error!("Failed to start stream server: {e}"),
        }
      });

      // 2. Ensure data dirs and files exist.
      if let Err(e) = paths::ensure_data_files(&handle) {
        eprintln!("failed to prepare data directory: {e}");
        log::error!("Failed to prepare data files: {}", e)
      }

      // 2. Spawn the startup library scan on a worker thread.
      //    Don't block setup — scanning a large library could take seconds.
      let scan_handle = handle.clone();
      tauri::async_runtime::spawn(async move {
        commands::library::startup_scan(scan_handle).await;
      });

      /* Desktop-only setup. Everything below touches APIs that are
       * `#[cfg(desktop)]`-gated inside Tauri itself (tray, window icons, global shortcuts, menu).
       **/
      #[cfg(desktop)]
      {
        // 3. Register global shortcuts (was `setShortcuts()`).
        if let Err(e) = register_shortcuts(&handle) {
          eprintln!("shortcut registration failed: {e}");
        }

        // 4. Build tray.
        build_tray(&handle)?;

        // 4. Wire main-window close → hide-to-tray.
        wire_main_window(&handle);
      }

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
