use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::ipc::Channel;
use walkdir::WalkDir;

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
    /// Number of files available in the cached scan.
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

/// Holds active filesystem watchers, keyed by watcher ID.
pub struct WatchState {
    pub watchers: Mutex<HashMap<String, RecommendedWatcher>>,
}

/// Holds scanned file lists, keyed by scan ID.
pub struct ScanCache {
    pub files: Mutex<HashMap<String, Vec<LibraryFile>>>,
}

/// Media file extensions indexed by the library.
const MEDIA_EXTENSIONS: &[&str] = &[
    "mkv", "mp4", "m4v", "webm", "mov", "avi", "flv", "wmv", "ogv", "mp3", "flac", "wav",
"m4a", "aac", "ogg", "opus", "wma",
];

/// Scan a folder and cache its media files for later pagination.
#[tauri::command]
pub async fn scan_folder(
    path: String,
    folder_id: String,
    on_progress: Channel<ScanProgress>,
) -> Result<(ScanResult, String), String> {
    let root = PathBuf::from(&path);

    if !root.is_dir() {
        return Err(format!("not a directory: {path}"));
    }

    // Pass 1: count matching files for progress reporting.
    let mut expected = 0usize;

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
        {
            if entry.file_type().is_file() && is_media(entry.path()) {
                expected += 1;
            }
        }

        // Pass 2: collect matching files and periodically report progress.
        let mut files: Vec<LibraryFile> = Vec::with_capacity(expected);
        let mut found = 0usize;
        let emit_every = (expected / 100).max(50);

        for entry in WalkDir::new(&root)
            .follow_links(false)
            .into_iter()
            .filter_map(Result::ok)
            {
                if !entry.file_type().is_file() || !is_media(entry.path()) {
                    continue;
                }

                found += 1;

                let meta = match entry.metadata() {
                    Ok(metadata) => metadata,
                    Err(_) => continue,
                };

                let file_path = entry.path().to_string_lossy().to_string();
                let name = entry.file_name().to_string_lossy().to_string();
                let extension = entry
                .path()
                .extension()
                .map(|ext| ext.to_string_lossy().to_lowercase())
                .unwrap_or_default();

                files.push(LibraryFile {
                    path: file_path,
                    name,
                    folder_id: folder_id.clone(),
                           size: meta.len(),
                           extension,
                });

                if found % emit_every == 0 || found == expected {
                    let _ = on_progress.send(ScanProgress {
                        items_found: found,
                        items_expected: expected,
                        current_folder: folder_id.clone(),
                    });
                }
            }

            let scan_id = format!(
                "scan-{}",
                std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|duration| duration.as_millis())
                .unwrap_or(0)
            );

            // Keep the cache bounded to avoid excessive memory use.
            const MAX_CACHED: usize = 50_000;
            files.truncate(MAX_CACHED);

            let cached_count = files.len();
            let cache = crate::state::get_scan_cache();

            cache
            .files
            .lock()
            .map_err(|error| format!("cache lock: {error}"))?
            .insert(scan_id.clone(), files);

            Ok((
                ScanResult {
                    items_found: cached_count,
                    cancelled: false,
                },
                scan_id,
            ))
}

/// Fetch a page of files from a cached scan.
#[tauri::command]
pub async fn get_library_page(
    scan_id: String,
    offset: usize,
    limit: usize,
) -> Result<Vec<LibraryFile>, String> {
    let cache = crate::state::get_scan_cache();
    let guard = cache
    .files
    .lock()
    .map_err(|error| format!("cache lock: {error}"))?;

    let files = guard.get(&scan_id).ok_or("scan not found")?;
    let start = offset.min(files.len());
    let end = offset.saturating_add(limit).min(files.len());

    Ok(files[start..end].to_vec())
}

/// Metadata returned by ffprobe.
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

/// Extract media metadata using ffprobe.
#[tauri::command]
pub async fn probe_media_file(path: String) -> Result<MediaProbe, String> {
    let output = std::process::Command::new("ffprobe")
    .args([
        "-v",
        "error",
        "-print_format",
        "json",
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
                    video_codec = stream
                    .get("codec_name")
                    .and_then(|codec| codec.as_str())
                    .unwrap_or("")
                    .to_string();
                }
                Some("audio") if !has_audio => {
                    has_audio = true;
                    audio_codec = stream
                    .get("codec_name")
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

/// Start watching a folder recursively for filesystem changes.
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
                use tauri::Emitter;
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

/// Stop and remove a filesystem watcher.
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

fn is_media(path: &Path) -> bool {
    path.extension()
    .and_then(|extension| extension.to_str())
    .map(|extension| {
        let extension = extension.to_lowercase();
        MEDIA_EXTENSIONS.contains(&extension.as_str())
    })
    .unwrap_or(false)
}

fn uuid_like() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let nanos = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_nanos())
    .unwrap_or(0);

    format!("{nanos:x}")
}
