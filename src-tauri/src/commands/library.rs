use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use walkdir::WalkDir;
use tauri::{ipc::Channel, Emitter, Manager};

/* ============================================================
 *  Constants
 *  ============================================================ */

const INDEX_VERSION: u32 = 1;
const INDEX_MAX_FILES: usize = 50_000;

const MEDIA_EXTENSIONS: &[&str] = &[
    "mkv", "mp4", "m4v", "webm", "mov", "avi", "flv", "wmv", "ogv",
"mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "wma",
];

/* ============================================================
 *  Public types
 *  ============================================================ */

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub items_found: usize,
    pub items_expected: usize,
    pub current_folder: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub items_found: usize,
    pub cancelled: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LibraryFile {
    pub path: String,
    pub name: String,
    pub folder_id: String,
    pub size: u64,
    pub extension: String,
}

#[derive(Clone)]
pub struct PersistedFolder {
    pub id: String,
    pub path: String,
    pub label: String,
    pub item_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryMeta {
    pub has_index: bool,
    pub total_count: usize,
    pub folder_counts: HashMap<String, usize>,
    pub scanned_at: u64,
    pub scan_id: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProbe {
    pub duration: f64,
    pub has_video: bool,
    pub has_audio: bool,
    pub video_codec: String,
    pub audio_codec: String,
}

impl MediaProbe {
    fn unknown() -> Self {
        Self {
            duration: 0.0,
            has_video: false,
            has_audio: false,
            video_codec: String::new(),
            audio_codec: String::new(),
        }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LibraryIndex {
    pub v: u32,
    pub scanned_at: u64,
    pub folder_counts: HashMap<String, usize>,
    pub total_count: usize,
    pub files: Vec<LibraryFile>,
}

/* ============================================================
 *  Runtime state — not serialized, managed by Tauri
 *  ============================================================ */

pub struct LibraryCache {
    pub index: Mutex<Option<LibraryIndex>>,
    pub scan_id: Mutex<Option<String>>,
}

pub struct WatchState {
    pub watchers: Mutex<HashMap<String, RecommendedWatcher>>,
}

/* ============================================================
 *  Scan commands
 *  ============================================================ */

#[tauri::command]
pub async fn scan_folder(
    app: tauri::AppHandle,
    path: String,
    folder_id: String,
    on_progress: Channel<ScanProgress>,
) -> Result<(ScanResult, String), String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err(format!("not a directory: {path}"));
    }

    // Pass 1: count.
    let mut expected = 0usize;
    for entry in WalkDir::new(&root).follow_links(false).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() && is_media(entry.path()) {
            expected += 1;
        }
    }

    // Pass 2: collect.
    let mut files: Vec<LibraryFile> = Vec::with_capacity(expected);
    let mut found = 0usize;
    let emit_every = (expected / 100).max(50);

    for entry in WalkDir::new(&root).follow_links(false).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() || !is_media(entry.path()) {
            continue;
        }
        found += 1;
        let Ok(meta) = entry.metadata() else { continue };

        files.push(LibraryFile {
            path: entry.path().to_string_lossy().to_string(),
                   name: entry.file_name().to_string_lossy().to_string(),
                   folder_id: folder_id.clone(),
                   size: meta.len(),
                   extension: entry.path()
                   .extension()
                   .map(|e| e.to_string_lossy().to_lowercase())
                   .unwrap_or_default(),
        });

        if found % emit_every == 0 || found == expected {
            let _ = on_progress.send(ScanProgress {
                items_found: found,
                items_expected: expected,
                current_folder: folder_id.clone(),
            });
        }
    }

    let scan_id = format!("scan-{}", now_ms());
    let result = ScanResult { items_found: files.len(), cancelled: false };

    // Merge into the existing index.
    let cache = app.state::<LibraryCache>();
    let mut guard = cache.index.lock().map_err(|e| format!("lock: {e}"))?;
    let mut current = guard.take().unwrap_or_else(|| LibraryIndex {
        v: INDEX_VERSION,
        scanned_at: 0,
        folder_counts: HashMap::new(),
                                                  total_count: 0,
                                                  files: Vec::new(),
    });

    current.files.retain(|f| f.folder_id != folder_id);
    current.files.extend(files);
    current.folder_counts.insert(folder_id.clone(), result.items_found);
    current.total_count = current.files.len();
    current.scanned_at = now_ms();

    if current.files.len() > INDEX_MAX_FILES {
        current.files.truncate(INDEX_MAX_FILES);
        current.total_count = current.files.len();
    }

    // Persist to disk.
    let index_path = crate::paths::library_index_file(&app);
    if let Some(parent) = index_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(&current) {
        if let Err(e) = std::fs::write(&index_path, json) {
            log::error!("Failed to write library index: {e}");
        } else {
            log::info!("Library index written: {} files", current.total_count);
        }
    }

    *guard = Some(current);
    drop(guard);

    *cache.scan_id.lock().map_err(|e| format!("lock: {e}"))? = Some(scan_id.clone());

    let _ = app.emit("library-index-ready", ());

    Ok((result, scan_id))
}

/* ============================================================
 *  Read commands
 *  ============================================================ */

#[tauri::command]
pub async fn get_library_page(
    app: tauri::AppHandle,
    offset: usize,
    limit: usize,
) -> Result<Vec<LibraryFile>, String> {
    let cache = app.state::<LibraryCache>();
    let guard = cache.index.lock().map_err(|e| format!("lock: {e}"))?;
    let Some(index) = guard.as_ref() else {
        return Ok(Vec::new());
    };
    let start = offset.min(index.files.len());
    let end = (offset + limit).min(index.files.len());
    Ok(index.files[start..end].to_vec())
}

#[tauri::command]
pub async fn get_library_meta(
    app: tauri::AppHandle,
) -> Result<LibraryMeta, String> {
    let cache = app.state::<LibraryCache>();
    let guard = cache.index.lock().map_err(|e| format!("lock: {e}"))?;
    match guard.as_ref() {
        Some(index) => Ok(LibraryMeta {
            has_index: true,
            total_count: index.total_count,
            folder_counts: index.folder_counts.clone(),
                          scanned_at: index.scanned_at,
                          scan_id: cache.scan_id.lock().ok().and_then(|s| s.clone()),
        }),
        None => Ok(LibraryMeta {
            has_index: false,
            total_count: 0,
            folder_counts: HashMap::new(),
                   scanned_at: 0,
                   scan_id: None,
        }),
    }
}

/* ============================================================
 *  ffprobe
 *  ============================================================ */

#[tauri::command]
pub async fn probe_media_file(path: String) -> Result<MediaProbe, String> {
    let output = std::process::Command::new("ffprobe")
    .args([
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        &path,
    ])
    .output();

    let Ok(output) = output else {
        return Ok(MediaProbe::unknown());
    };

    if !output.status.success() {
        return Ok(MediaProbe::unknown());
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
    .map_err(|error| format!("parse ffprobe output: {error}"))?;

    let duration = json
    .get("format")
    .and_then(|format| format.get("duration"))
    .and_then(|duration| duration.as_str())
    .and_then(|duration| duration.parse::<f64>().ok())
    .unwrap_or(0.0);

    let mut has_video = false;
    let mut has_audio = false;
    let mut video_codec = String::new();
    let mut audio_codec = String::new();

    if let Some(streams) = json.get("streams").and_then(|streams| streams.as_array()) {
        for stream in streams {
            match stream.get("codec_type").and_then(|value| value.as_str()) {
                Some("video") if !has_video => {
                    has_video = true;
                    video_codec = stream.get("codec_name")
                    .and_then(|codec| codec.as_str())
                    .unwrap_or("")
                    .to_string();
                }
                Some("audio") if !has_audio => {
                    has_audio = true;
                    audio_codec = stream.get("codec_name")
                    .and_then(|codec| codec.as_str())
                    .unwrap_or("")
                    .to_string();
                }
                _ => {}
            }
        }
    }

    Ok(MediaProbe {
        duration,
       has_video,
       has_audio,
       video_codec,
       audio_codec,
    })
}

/* ============================================================
 *  Startup scan
 *  ============================================================ */

pub async fn startup_scan(app: tauri::AppHandle) {
    let index_path = crate::paths::library_index_file(&app);

    if index_path.exists() {
        match std::fs::read_to_string(&index_path) {
            Ok(raw) => match serde_json::from_str::<LibraryIndex>(&raw) {
                Ok(index) if index.v == INDEX_VERSION => {
                    let cache = app.state::<LibraryCache>();
                    if let Ok(mut guard) = cache.index.lock() {
                        log::info!("Library index loaded: {} files", index.total_count);
                        *guard = Some(index);
                    }
                    let _ = app.emit("library-index-ready", ());
                    return;
                }
                Ok(_) => log::warn!("Library index version mismatch, will rescan"),
                Err(e) => log::warn!("Library index parse error: {e}, will rescan"),
            },
            Err(e) => log::warn!("Library index read error: {e}, will rescan"),
        }
    }

    let folders = read_folders_from_settings(&app);
    if folders.is_empty() {
        log::info!("No library folders configured, skipping startup scan");
        return;
    }

    log::info!("Startup scan: {} folders", folders.len());
    for folder in folders {
        scan_folder_no_progress(&app, &folder.path, &folder.id).await;
    }

    // Persist the merged index after all folders have been scanned.
    if let Ok(mut guard) = app.state::<LibraryCache>().index.lock() {
        if let Some(index) = guard.as_ref() {
            if let Ok(json) = serde_json::to_string_pretty(index) {
                if let Err(e) = std::fs::write(&index_path, json) {
                    log::error!("Failed to write library index at startup: {e}");
                } else {
                    log::info!("Startup library index written: {} files", index.total_count);
                }
            }
        }
    }

    let _ = app.emit("library-index-ready", ());
}

async fn scan_folder_no_progress(app: &tauri::AppHandle, path: &str, folder_id: &str) {
    let root = PathBuf::from(path);
    if !root.is_dir() {
        log::warn!("Startup scan skipped, not a dir: {path}");
        return;
    }

    let mut files: Vec<LibraryFile> = Vec::new();
    for entry in WalkDir::new(&root).follow_links(false).into_iter().filter_map(|e| e.ok()) {
        if !entry.file_type().is_file() || !is_media(entry.path()) {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };
        files.push(LibraryFile {
            path: entry.path().to_string_lossy().to_string(),
                   name: entry.file_name().to_string_lossy().to_string(),
                   folder_id: folder_id.to_string(),
                   size: meta.len(),
                   extension: entry.path().extension()
                   .map(|e| e.to_string_lossy().to_lowercase())
                   .unwrap_or_default(),
        });
    }

    let count = files.len();
    let cache = app.state::<LibraryCache>();
    let Ok(mut guard) = cache.index.lock() else {
        log::warn!("Startup scan: could not lock index for {path}");
        return;
    };

    let mut current = guard.take().unwrap_or_else(|| LibraryIndex {
        v: INDEX_VERSION,
        scanned_at: 0,
        folder_counts: Default::default(),
                                                  total_count: 0,
                                                  files: Vec::new(),
    });

    current.files.retain(|f| f.folder_id != folder_id);
    current.files.extend(files);
    current.folder_counts.insert(folder_id.to_string(), count);
    current.total_count = current.files.len();
    current.scanned_at = now_ms();

    *guard = Some(current);

    log::info!("Startup scan: {} found {} files", path, count);
}

fn read_folders_from_settings(app: &tauri::AppHandle) -> Vec<PersistedFolder> {
    let path = crate::paths::settings_file(app);
    let Ok(raw) = std::fs::read_to_string(&path) else { return Vec::new() };
    let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) else { return Vec::new() };
    let Some(arr) = json.get("libraryFolders").and_then(|v| v.as_array()) else {
        return Vec::new();
    };
    arr.iter().filter_map(|f| {
        Some(PersistedFolder {
            id: f.get("id")?.as_str()?.to_string(),
             path: f.get("path")?.as_str()?.to_string(),
             label: f.get("label")?.as_str().unwrap_or("").to_string(),
             item_count: f.get("itemCount")?.as_u64().unwrap_or(0) as usize,
        })
    }).collect()
}

/* ============================================================
 *  Watch commands
 *  ============================================================ */

#[tauri::command]
pub async fn watch_folder(
    app: tauri::AppHandle,
    path: String,
    state: tauri::State<'_, WatchState>,
) -> Result<String, String> {
    let id = format!("watch-{}", uuid_like());
    let id_for_event = id.clone();

    let mut watcher = notify::recommended_watcher(
        move |result: notify::Result<notify::Event>| {
            if result.is_ok() {
                let _ = app.emit(&format!("folder-changed:{id_for_event}"), ());
            }
        },
    )
    .map_err(|error| format!("create watcher: {error}"))?;

    watcher
    .watch(Path::new(&path), RecursiveMode::Recursive)
    .map_err(|error| format!("watch folder: {error}"))?;

    state
    .watchers
    .lock()
    .map_err(|error| format!("watcher lock: {error}"))?
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
    .map_err(|error| format!("watcher lock: {error}"))?
    .remove(&id);

    Ok(())
}

/* ============================================================
 *  Helpers
 *  ============================================================ */

fn now_ms() -> u64 {
    SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_millis() as u64)
    .unwrap_or(0)
}

fn is_media(path: &Path) -> bool {
    path.extension()
    .and_then(|e| e.to_str())
    .map(|e| MEDIA_EXTENSIONS.contains(&e.to_lowercase().as_str()))
    .unwrap_or(false)
}

fn uuid_like() -> String {
    let nanos = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_nanos())
    .unwrap_or(0);
    format!("{nanos:x}")
}
