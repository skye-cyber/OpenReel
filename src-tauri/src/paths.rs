//! Centralized path resolution for OpenReel user data.
//!
//! # Why this module exists
//!
//! Every file the app writes — settings, session state, playback
//! positions, plugin manifests, library index, log output — must resolve
//! its path here. Hardcoding `.openreel` in multiple command modules is
//! exactly the class of bug this module is meant to prevent: a mismatch
//! between the write path and the read path produces data that appears
//! to vanish.
//!
//! # Layout
//!
//! ```text
//! ~/.openreel/
//! ├── config/
//! │   └── settings.json
//! ├── state/
//! │   ├── session.json
//! │   └── safe-mode.flag
//! ├── library/
//! │   └── index.json
//! ├── plugins/
//! │   └── state.json
//! ├── positions.json
//! └── logs/
//!     └── openreel.log
//! ```
//!
//! # Desktop path
//!
//! `~/.openreel` is a deliberate deviation from XDG (`~/.config/openreel`,
//! `~/.local/share/openreel`). The reasons: users inspect and edit
//! `settings.json` by hand, back up by copying one directory, and expect
//! to find app config in `$HOME` for tools like this. The tradeoff is
//! that we don't follow the XDG Base Directory spec.
//!
//! # Contract
//!
//! Every command that touches the filesystem must resolve paths through
//! this module. Do not compute `.openreel` paths independently.
//!
//! # Fallback behavior
//!
//! If `$HOME` is unset or unwritable, we degrade to the OS temp directory
//! rather than panic. Data written there is non-persistent, which is a
//! safer failure mode than taking down user commands.

use std::path::PathBuf;

use tauri::AppHandle;

/// The base directory for all user data.
///
/// Resolves to `~/.openreel`. If `$HOME` cannot be resolved, falls back
/// to the OS temp directory — see the module doc for why.
pub fn base_dir(app: &AppHandle) -> PathBuf {
    #[cfg(desktop)]
    {
        dirs::home_dir()
        .map(|h| h.join(".openreel"))
        .unwrap_or_else(|| std::env::temp_dir().join(".openreel"))
    }
    #[cfg(mobile)]
    {
        app.path().app_data_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("openreel"))
    }
}

// ---- Subdirectory helpers -----------------------------------------------
//
// Each helper returns a path. Callers are responsible for calling
// `create_dir_all` on the parent before writing — that is done once at
// startup by `ensure_data_dirs`, so most callers can assume the parent
// exists.

pub fn config_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("config")
}

pub fn state_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("state")
}

pub fn library_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("library")
}

pub fn plugins_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("plugins")
}

pub fn logs_dir(app: &AppHandle) -> PathBuf {
    base_dir(app).join("logs")
}

// ---- Specific files -----------------------------------------------------
//
// These are the actual files the app writes. Using named helpers rather
// than string concatenation at call sites means renaming a file is a
// one-line change here, not a grep across the codebase.

pub fn settings_file(app: &AppHandle) -> PathBuf {
    config_dir(app).join("settings.json")
}

pub fn session_file(app: &AppHandle) -> PathBuf {
    state_dir(app).join("session.json")
}

pub fn safe_mode_file(app: &AppHandle) -> PathBuf {
    state_dir(app).join("safe-mode.flag")
}

pub fn positions_file(app: &AppHandle) -> PathBuf {
    base_dir(app).join("positions.json")
}

pub fn library_index_file(app: &AppHandle) -> PathBuf {
    library_dir(app).join("index.json")
}

pub fn plugin_state_file(app: &AppHandle) -> PathBuf {
    plugins_dir(app).join("state.json")
}

pub fn log_file(app: &AppHandle) -> PathBuf {
    logs_dir(app).join("openreel.log")
}


/// Ensure every directory the app writes to exists.
///
/// Idempotent. Safe to call on every launch. Called once from `setup()`.
///
/// Creating directories eagerly means command handlers can assume the
/// parent exists and don't need defensive `create_dir_all` calls before
/// every write.
pub fn ensure_data_dirs(app: &AppHandle) -> std::io::Result<PathBuf> {
    let base = base_dir(app);
    std::fs::create_dir_all(&base)?;
    for sub in ["config", "state", "library", "plugins", "logs"] {
        std::fs::create_dir_all(base.join(sub))?;
    }
    Ok(base)
}

/// Ensure a JSON file exists with the given initial content.
///
/// Used to seed `settings.json` and `plugin state.json` on first run.
/// No-op if the file already exists.
pub fn ensure_json_file(path: &PathBuf, initial: &str) -> std::io::Result<()> {
    if !path.exists() {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::write(path, initial)?;
    }
    Ok(())
}

/// Seed the initial JSON files the app expects to exist on first launch.
///
/// Creates `settings.json` in `config/` and `state.json` in `plugins/`.
/// No-op if the files already exist — never overwrites user data.
///
/// Called once from `setup()`. Callers should have already run
/// `ensure_data_dirs`; this function will run it again if needed (it's
/// idempotent) so it can be used standalone.
pub fn ensure_data_files(app: &AppHandle) -> std::io::Result<()> {
    ensure_data_dirs(app)?;

    ensure_json_file(
        &settings_file(app),
                     "{\n  \"v\": 1,\n  \"themePref\": \"system\",\n  \"vol\": 0.72,\n  \"muted\": false,\n  \"speed\": 1,\n  \"plugins\": {},\n  \"settings\": {},\n  \"libraryMeta\": { \"folders\": 0, \"itemCount\": 0, \"lastScanAt\": null },\n  \"libraryFolders\": [],\n  \"repositories\": [],\n  \"subTrack\": -1\n}\n",
    )?;

    ensure_json_file(
        &plugin_state_file(app),
                     "{\n  \"enabled\": {}\n}\n",
    )?;

    Ok(())
}
