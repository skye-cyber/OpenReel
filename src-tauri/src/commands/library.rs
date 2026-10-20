use serde::Serialize;
use std::collections::HashMap;
use std::sync::Mutex;

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use walkdir::WalkDir;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub items_found: usize,
    pub items_expected: usize,
    pub current_folder: String
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub items_found: usize,
    pub cancelled: bool,
}

pub struct WatchState {
    pub watchers: Mutex<HashMap<String, RecommendedWatcher>>,
}

#[tauri::command]
pub async fn scan_folder(
    path: String,
    on_progress: tauri::ipc::Channel<ScanProgress>,
) -> Result<ScanResult, String> {
    log::info!("Scanning folder: {}", path);
    // First pass: count files.
    let mut expected = 0usize;
    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            expected += 1;
        }
    }

    // Second pass: report progress.
    let mut found = 0usize;
    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            found += 1;
            if found % 50 == 0 || found == expected {
                let _ = on_progress.send(ScanProgress {
                    items_found: found,
                    items_expected: expected,
                    current_folder: path.to_string(),
                });
            }
        }
    }
    log::info!("Scan complete: {} files in {}", found, path);
    Ok(ScanResult { items_found: found, cancelled: false })
}

#[tauri::command]
pub async fn watch_folder(
    app: tauri::AppHandle,
    path: String,
    state: tauri::State<'_, WatchState>,
) -> Result<String, String> {
    let id = format!("watch-{}", uuid_like());
    let id_for_event = id.clone();

    let mut watcher = notify::recommended_watcher(
        move |res: notify::Result<notify::Event>| {
            if res.is_ok() {
                use tauri::Emitter;
                let _ = app.emit(&format!("folder-changed:{}", id_for_event), ());
            }
        },
    )
    .map_err(|e| format!("watcher: {e}"))?;

    watcher
    .watch(std::path::Path::new(&path), RecursiveMode::Recursive)
    .map_err(|e| format!("watch: {e}"))?;

    state
    .watchers
    .lock()
    .map_err(|e| format!("lock: {e}"))?
    .insert(id.clone(), watcher);

    Ok(id)
}

#[tauri::command]
pub async fn unwatch_folder(
    id: String,
    state: tauri::State<'_, WatchState>,
) -> Result<(), String> {
    state
    .watchers
    .lock()
    .map_err(|e| format!("lock: {e}"))?
    .remove(&id);
    Ok(())
}

fn uuid_like() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_nanos())
    .unwrap_or(0);
    format!("{:x}", nanos)
}
