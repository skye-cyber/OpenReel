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
use crate::paths;
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

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct MediaProbe {
    // ---- Container / format ----
    pub format_name: String,        // "matroska,webm", "mov,mp4,..."
    pub format_long_name: String,   // "Matroska / WebM"
    pub duration: f64,              // seconds
    pub size_bytes: u64,
    pub bit_rate: u64,              // container overall bitrate, bps
    pub nb_streams: u32,

    // ---- Aggregates (convenience for the UI) ----
    pub has_video: bool,
    pub has_audio: bool,
    pub has_subtitles: bool,

    // ---- Streams ----
    pub video_streams: Vec<VideoStream>,
    pub audio_streams: Vec<AudioStream>,
    pub subtitle_streams: Vec<SubtitleStream>,

    // ---- Chapters ----
    pub chapters: Vec<Chapter>,

    // ---- Tags on the container (title, artist, album, etc.) ----
    pub tags: HashMap<String, String>,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct VideoStream {
    pub index: u32,
    pub codec: String,           // "h264", "hevc"
    pub profile: String,         // "High", "Main 10"
    pub level: i32,              // 41, 51
    pub width: u32,
    pub height: u32,
    pub display_aspect_ratio: String,  // "16:9"
    pub pix_fmt: String,         // "yuv420p", "yuv420p10le"
    pub bit_depth: Option<u32>,  // derived from pix_fmt
    pub frame_rate: f64,         // 23.976
    pub avg_frame_rate: f64,
    pub bit_rate: u64,
    pub color_space: String,     // "bt709"
    pub color_transfer: String,  // "bt709"
    pub color_primaries: String, // "bt709"
    pub language: Option<String>,
    pub title: Option<String>,
    pub is_default: bool,
    pub is_attached_pic: bool,   // cover art, not a real video stream
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct AudioStream {
    pub index: u32,
    pub codec: String,           // "aac", "flac", "ac3"
    pub profile: String,
    pub sample_rate: u32,        // 48000
    pub channels: u32,           // 6
    pub channel_layout: String,  // "5.1(side)"
    pub bit_rate: u64,
    pub bit_depth: Option<u32>,
    pub language: Option<String>,
    pub title: Option<String>,
    pub is_default: bool,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct SubtitleStream {
    pub index: u32,
    pub codec: String,           // "subrip", "ass", "webvtt"
    pub language: Option<String>,
    pub title: Option<String>,
    pub is_default: bool,
    pub is_forced: bool,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct Chapter {
    pub id: u32,
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub title: String,
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
pub async fn probe_media_file(
    app: tauri::AppHandle,
    path: String,
) -> Result<MediaProbe, String> {
    use tauri::Manager;

    let ffprobe_path = paths::sidecar_path("openreel-ffprobe")?;
    log::info!("ffprobe resolved to: {}", ffprobe_path.display());

    let output = std::process::Command::new(&ffprobe_path)
    .args([
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        "-show_chapters",
        &path,
    ])
    .output();

    let Ok(output) = output else {
        log::warn!("ffprobe spawn failed for {path}");
        return Ok(MediaProbe::default());
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        log::warn!("ffprobe failed for {path}: {stderr}");
        return Ok(MediaProbe::default());
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
    .map_err(|e| format!("parse ffprobe output: {e}"))?;

    Ok(parse_probe(json))
}

fn parse_probe(json: serde_json::Value) -> MediaProbe {
    let mut probe = MediaProbe::default();

    // ---------- Format ----------
    if let Some(format) = json.get("format") {
        probe.format_name = get_str(format, "format_name");
        probe.format_long_name = get_str(format, "format_long_name");
        probe.duration = get_f64(format, "duration");
        probe.size_bytes = get_u64(format, "size");
        probe.bit_rate = get_u64(format, "bit_rate");
        probe.tags = parse_tags(format.get("tags"));

        // Some formats (e.g. a raw AAC file) don't report nb_streams in
        // format but it's derivable. Leave as 0 if absent.
        probe.nb_streams = format
        .get("nb_streams")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as u32;
    }

    // ---------- Streams ----------
    if let Some(streams) = json.get("streams").and_then(|s| s.as_array()) {
        if probe.nb_streams == 0 {
            probe.nb_streams = streams.len() as u32;
        }

        for stream in streams {
            let codec_type = get_str(stream, "codec_type");
            let disposition = stream.get("disposition");
            let is_default = disposition
            .and_then(|d| d.get("default"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0) == 1;

            match codec_type.as_str() {
                "video" => {
                    // Attached_pic is cover art — not a playable stream.
                    let is_attached_pic = disposition
                    .and_then(|d| d.get("attached_pic"))
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0) == 1;

                    let pix_fmt = get_str(stream, "pix_fmt");
                    let bit_depth = pix_fmt_to_bit_depth(&pix_fmt);

                    probe.video_streams.push(VideoStream {
                        index: stream.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        codec: get_str(stream, "codec_name"),
                        profile: get_str(stream, "profile"),
                        level: stream.get("level").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                        width: stream.get("width").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        height: stream.get("height").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        display_aspect_ratio: get_str(stream, "display_aspect_ratio"),
                        pix_fmt,
                        bit_depth,
                        frame_rate: parse_rational(get_str(stream, "r_frame_rate")),
                        avg_frame_rate: parse_rational(get_str(stream, "avg_frame_rate")),
                        bit_rate: get_u64(stream, "bit_rate"),
                        color_space: get_str(stream, "color_space"),
                        color_transfer: get_str(stream, "color_transfer"),
                        color_primaries: get_str(stream, "color_primaries"),
                        language: get_opt_str(stream, "tags", "language"),
                        title: get_opt_str(stream, "tags", "title"),
                        is_default,
                        is_attached_pic,
                    });
                }
                "audio" => {
                    let bits_per_raw_sample = stream
                    .get("bits_per_raw_sample")
                    .and_then(|v| v.as_str())
                    .and_then(|s| s.parse::<u32>().ok());

                    probe.audio_streams.push(AudioStream {
                        index: stream.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        codec: get_str(stream, "codec_name"),
                        profile: get_str(stream, "profile"),
                        sample_rate: stream
                        .get("sample_rate")
                        .and_then(|v| v.as_str())
                        .and_then(|s| s.parse::<u32>().ok())
                        .unwrap_or(0),
                        channels: stream.get("channels").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        channel_layout: get_str(stream, "channel_layout"),
                        bit_rate: get_u64(stream, "bit_rate"),
                        bit_depth: bits_per_raw_sample,
                        language: get_opt_str(stream, "tags", "language"),
                        title: get_opt_str(stream, "tags", "title"),
                        is_default,
                    });
                }
                "subtitle" => {
                    let is_forced = disposition
                    .and_then(|d| d.get("forced"))
                    .and_then(|v| v.as_i64())
                    .unwrap_or(0) == 1;

                    probe.subtitle_streams.push(SubtitleStream {
                        index: stream.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                        codec: get_str(stream, "codec_name"),
                        language: get_opt_str(stream, "tags", "language"),
                        title: get_opt_str(stream, "tags", "title"),
                        is_default,
                        is_forced,
                    });
                }
                _ => {
                    // Data streams, attachment streams — ignore.
                }
            }
        }
    }

    // ---------- Chapters ----------
    if let Some(chapters) = json.get("chapters").and_then(|c| c.as_array()) {
        for (i, chapter) in chapters.iter().enumerate() {
            probe.chapters.push(Chapter {
                id: chapter
                .get("id")
                .and_then(|v| v.as_u64())
                .unwrap_or(i as u64) as u32,
                start_seconds: chapter
                .get("start_time")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0),
                end_seconds: chapter
                .get("end_time")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(0.0),
                title: get_opt_str(chapter, "tags", "title").unwrap_or_default(),
            });
        }
    }

    // ---------- Derive aggregates ----------
    // `has_video` excludes attached_pic streams (cover art on audio files).
    probe.has_video = probe.video_streams.iter().any(|v| !v.is_attached_pic);
    probe.has_audio = !probe.audio_streams.is_empty();
    probe.has_subtitles = !probe.subtitle_streams.is_empty();

    probe
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

fn get_str(v: &serde_json::Value, key: &str) -> String {
    v.get(key).and_then(|x| x.as_str()).unwrap_or("").to_string()
}

fn get_opt_str(v: &serde_json::Value, group: &str, key: &str) -> Option<String> {
    v.get(group)
    .and_then(|g| g.get(key))
    .and_then(|x| x.as_str())
    .filter(|s| !s.is_empty())
    .map(|s| s.to_string())
}

fn get_f64(v: &serde_json::Value, key: &str) -> f64 {
    v.get(key)
    .and_then(|x| x.as_str())
    .and_then(|s| s.parse::<f64>().ok())
    .or_else(|| v.get(key).and_then(|x| x.as_f64()))
    .unwrap_or(0.0)
}

fn get_u64(v: &serde_json::Value, key: &str) -> u64 {
    v.get(key)
    .and_then(|x| x.as_str())
    .and_then(|s| s.parse::<u64>().ok())
    .or_else(|| v.get(key).and_then(|x| x.as_u64()))
    .unwrap_or(0)
}

fn parse_tags(v: Option<&serde_json::Value>) -> HashMap<String, String> {
    let mut out = HashMap::new();
    if let Some(tags) = v.and_then(|t| t.as_object()) {
        for (k, val) in tags {
            if let Some(s) = val.as_str() {
                out.insert(k.to_lowercase(), s.to_string());
            }
        }
    }
    out
}

/// ffprobe reports frame rate as a rational string like "24000/1001".
fn parse_rational(s: String) -> f64 {
    if s.is_empty() || s == "0/0" {
        return 0.0;
    }
    if let Some((num, den)) = s.split_once('/') {
        let n = num.parse::<f64>().unwrap_or(0.0);
        let d = den.parse::<f64>().unwrap_or(0.0);
        if d > 0.0 { n / d } else { 0.0 }
    } else {
        s.parse::<f64>().unwrap_or(0.0)
    }
}

/// Derive bit depth from ffprobe's pix_fmt string.
fn pix_fmt_to_bit_depth(pix_fmt: &str) -> Option<u32> {
    if pix_fmt.contains("10le") || pix_fmt.contains("10be") {
        Some(10)
    } else if pix_fmt.contains("12le") || pix_fmt.contains("12be") {
        Some(12)
    } else if pix_fmt.contains("9le") || pix_fmt.contains("9be") {
        Some(9)
    } else if pix_fmt.is_empty() {
        None
    } else {
        Some(8)
    }
}

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
