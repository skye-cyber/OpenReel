use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use crate::paths;

// const SESSION_FILE: &str = "session.json";
// const SAFE_MODE_FILE: &str = "safe-mode.flag";
const CRASH_WINDOW_MS: u64 = 60_000;
const MAX_CRASH_LOG: usize = 5;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionState {
    pub clean_exit: bool,
    pub recent_crashes: Vec<u64>,
}

#[derive(Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SafeModeReason {
    User,
    Crash,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SafeModeFlag {
    active: bool,
    reason: SafeModeReason,
    activated_at: u64,
}

fn app_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))
}

fn session_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(paths::session_file(app))
}

fn safe_mode_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(paths::safe_mode_file(app))
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn read_session_state(path: &PathBuf) -> SessionState {
    log::info!("READ session start");
    if let Ok(raw) = fs::read_to_string(path) {
        if let Ok(state) = serde_json::from_str::<SessionState>(&raw) {
            let now = now_ms();
            let mut crashes: Vec<u64> = state
                .recent_crashes
                .into_iter()
                .filter(|t| now.saturating_sub(*t) < CRASH_WINDOW_MS)
                .collect();
            if crashes.len() > MAX_CRASH_LOG {
                crashes = crashes.split_off(crashes.len() - MAX_CRASH_LOG);
            }
            return SessionState { clean_exit: state.clean_exit, recent_crashes: crashes };
        }
    }
    SessionState { clean_exit: true, recent_crashes: vec![] }
}

fn write_session_state(path: &PathBuf, state: &SessionState) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create dir: {e}"))?;
    }
    let raw = serde_json::to_string(state).map_err(|e| format!("serialize: {e}"))?;
    fs::write(path, raw).map_err(|e| format!("write: {e}"))
}

#[tauri::command]
pub fn mark_session_start(app: AppHandle) -> Result<SessionState, String> {
    let path = session_path(&app)?;
    let previous = read_session_state(&path);

    let now = now_ms();
    let next_crashes = if previous.clean_exit {
        previous.recent_crashes.clone()
    } else {
        let mut c = previous.recent_crashes.clone();
        c.push(now);
        if c.len() > MAX_CRASH_LOG {
            c = c.split_off(c.len() - MAX_CRASH_LOG);
        }
        c
    };

    if previous.clean_exit {
        log::info!("Session start: previous exit was clean");
    } else {
        log::warn!("Session start: previous exit was unclean, {} crashes in window", previous.recent_crashes.len());
    }

    write_session_state(&path, &SessionState {
        clean_exit: false,
        recent_crashes: next_crashes,
    })?;

    Ok(previous)
}

#[tauri::command]
pub fn mark_clean_exit(app: AppHandle) -> Result<(), String> {
    let path = session_path(&app)?;
    let current = read_session_state(&path);
    write_session_state(&path, &SessionState {
        clean_exit: true,
        recent_crashes: current.recent_crashes,
    })
}

#[tauri::command]
pub fn is_safe_mode(app: AppHandle) -> Result<bool, String> {
    let path = safe_mode_path(&app)?;
    Ok(read_safe_mode(&path).is_some())
}

#[tauri::command]
pub fn get_safe_mode_reason(app: AppHandle) -> Result<Option<SafeModeReason>, String> {
    let path = safe_mode_path(&app)?;
    Ok(read_safe_mode(&path).map(|f| f.reason))
}

#[tauri::command]
pub fn enter_safe_mode(app: AppHandle, reason: SafeModeReason) -> Result<(), String> {
    let path = safe_mode_path(&app)?;
    let flag = SafeModeFlag { active: true, reason, activated_at: now_ms() };
    let raw = serde_json::to_string(&flag).map_err(|e| format!("serialize: {e}"))?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("create dir: {e}"))?;
    }
    fs::write(&path, raw).map_err(|e| format!("write: {e}"))?;

    // Clear crash log so the next normal start doesn't retrigger.
    let session_path = session_path(&app)?;
    let current = read_session_state(&session_path);
    write_session_state(&session_path, &SessionState {
        clean_exit: true,
        recent_crashes: current.recent_crashes,
    })
}

#[tauri::command]
pub fn exit_safe_mode(app: AppHandle) -> Result<(), String> {
    let path = safe_mode_path(&app)?;
    if path.exists() {
        fs::remove_file(&path).map_err(|e| format!("remove: {e}"))?;
    }
    Ok(())
}

fn read_safe_mode(path: &PathBuf) -> Option<SafeModeFlag> {
    let raw = fs::read_to_string(path).ok()?;
    serde_json::from_str::<SafeModeFlag>(&raw).ok()
}

#[tauri::command]
pub fn get_session_state(app: AppHandle) -> Result<SessionState, String> {
    let path = session_path(&app)?;
    Ok(read_session_state(&path))
}
