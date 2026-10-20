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

    let folders = default_media_folders();
    let folders_json = serde_json::to_string(&folders)
    .unwrap_or_else(|_| "[]".to_string());

    let content = format!(
        "{{\n  \"v\": 1,\n  \"themePref\": \"system\",\n  \"vol\": 0.72,\n  \"muted\": false,\n  \"speed\": 1,\n  \"plugins\": {{}},\n  \"settings\": {{}},\n  \"libraryMeta\": {{ \"folders\": {}, \"itemCount\": 0, \"lastScanAt\": null }},\n  \"libraryFolders\": {},\n  \"repositories\": [],\n  \"subTrack\": -1\n,\n  \"subTrack\": []\n}}\n",
        folders.len(),
                          folders_json,
    );

    ensure_json_file(
        &settings_file(app),
        &content,
    )?;
    ensure_json_file(
        &plugin_state_file(app),
        "{\n  \"enabled\": {}\n}\n",
    )?;

    Ok(())
}

/// Return the platform's standard media folders that exist on disk.
///
/// Used to seed `libraryFolders` on first launch and on reset. Only
/// returns folders whose paths actually exist — an empty array if
/// none do, which is fine (the user can add one manually).
///
/// Each entry matches the `Folder` shape the frontend expects:
/// `{ id, label, path, itemCount }`.
pub fn default_media_folders() -> Vec<serde_json::Value> {
    use serde_json::json;

    let Some(home) = dirs::home_dir() else {
        return Vec::new();
    };

    // Ordered by how commonly they hold media. The frontend seeds the
    // library from this list; order affects only the display order in
    // Settings → Library.
    let candidates: &[(&str, &str)] = &[
        ("Videos",     "Videos"),
        ("Music",      "Music"),
        ("Downloads",  "Downloads"),
        ("Documents",  "Documents"),
        ("Desktop",    "Desktop"),
    ];

    let mut out = Vec::new();
    for (subdir, label) in candidates {
        let path = home.join(subdir);
        if !path.is_dir() {
            continue;
        }
        let path_str = path.to_string_lossy().to_string();
        out.push(json!({
            "id": format!("default-{}", subdir.to_lowercase()),
                       "label": label,
                       "path": path_str,
                       "itemCount": 0,
        }));
    }
    out
}
