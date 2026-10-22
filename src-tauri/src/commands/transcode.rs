use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use tauri::ipc::Channel;
use tauri::Manager;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Semaphore;
use crate::http_server;
use crate::paths;

/// Max concurrent FFmpeg processes.
const MAX_CONCURRENT: usize = 2;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TranscodeProgress {
    pub processed_seconds: f64,
    pub total_seconds: f64,
    pub percent: f64,
    pub speed: f64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TranscodeResult {
    pub output_path: String,
    pub duration: f64,
    pub cached: bool,
}

#[derive(Clone)]
struct StreamInfo {
    index: u32,
    kind: StreamKind,      // Video | Audio | Subtitle
    codec: String,
    language: Option<String>,
    title: Option<String>,
    is_default: bool,
    is_forced: bool,
    /// True for album art (cover.jpg), false for real video streams.
    is_attached_pic: bool,
}

#[derive(Clone, Copy, PartialEq)]
enum StreamKind {
    Video,
    Audio,
    Subtitle,
}

struct ProbeResult {
    duration: f64,
    streams: Vec<StreamInfo>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedTrack {
    pub index: u32,
    pub language: Option<String>,
    pub title: Option<String>,
    pub is_default: bool,
    pub is_forced: bool,
    pub codec: String,
    pub url: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractedTracks {
    pub audio: Vec<ExtractedTrack>,
    pub subtitles: Vec<ExtractedTrack>,
    pub videos: Vec<ExtractedTrack>,
}

/// Runtime state for the transcode subsystem.
///
/// - `semaphore` limits concurrent FFmpeg spawns.
/// - `in_flight` deduplicates requests for the same source, so
///   opening the same file twice in quick succession attaches to the
///   existing job instead of spawning a second FFmpeg.
pub struct TranscodeManager {
    pub semaphore: Arc<Semaphore>,
    pub in_flight: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
}

impl TranscodeManager {
    pub fn new() -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT)),
            in_flight: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// ============================================================
// Command
// ============================================================

#[tauri::command]
pub async fn prepare_transcode(
    app: tauri::AppHandle,
    path: String,
    on_progress: Channel<TranscodeProgress>,
) -> Result<TranscodeResult, String> {
    // ---------- Validate source ----------
    let source = PathBuf::from(&path);
    if !source.exists() {
        return Err(format!("source not found: {path}"));
    }

    let meta = std::fs::metadata(&source)
    .map_err(|e| format!("stat source: {e}"))?;
    let mtime = meta.modified().ok()
    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
    .map(|d| d.as_secs())
    .unwrap_or(0);
    let key = format!("{:016x}", hash_key(&path, mtime, meta.len()));

    let cache_dir = crate::paths::transcode_cache_dir(&app);
    std::fs::create_dir_all(&cache_dir)
    .map_err(|e| format!("cache dir: {e}"))?;
    let output_path = cache_dir.join(format!("{key}.mp4"));

    // ---------- Cache hit ----------
    if output_path.exists() {
        log::info!("Transcode cache hit: {}", output_path.display());
        let duration = probe_duration(&app, &path).await.unwrap_or(0.0);
        return Ok(TranscodeResult {
            output_path: output_path.to_string_lossy().to_string(),
                  duration,
                  cached: true,
        });
    }

    // ---------- Dedupe ----------
    // If another request for the same key is in flight, poll the
    // output file until it appears. No second FFmpeg spawn.
    // ---------- Dedupe ----------
    let existing_cancel_flag: Option<Arc<AtomicBool>> = {
        let manager = app.state::<TranscodeManager>();
        let in_flight = manager.in_flight.lock()
        .map_err(|e| format!("lock: {e}"))?;
        in_flight.get(&key).cloned()
    };
    // `in_flight` guard is dropped here, before any await.

    if let Some(cancel_flag) = existing_cancel_flag {
        log::info!("Attaching to in-flight transcode for {path}");
        let deadline = std::time::Instant::now()
        + std::time::Duration::from_secs(900);
        loop {
            if output_path.exists() {
                let duration = probe_duration(&app, &path).await.unwrap_or(0.0);
                return Ok(TranscodeResult {
                    output_path: output_path.to_string_lossy().to_string(),
                          duration,
                          cached: false,
                });
            }
            if cancel_flag.load(Ordering::Relaxed) {
                return Err("transcode cancelled".into());
            }
            if std::time::Instant::now() > deadline {
                return Err("attached transcode timed out".into());
            }
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        }
    }

    // ---------- Acquire a slot ----------
    // `acquire_owned` returns a permit tied to the Arc<Semaphore>,
    // not to any borrow. Safe to hold across awaits.
    let permit = {
        let manager = app.state::<TranscodeManager>();
        manager.semaphore.clone()
        .acquire_owned()
        .await
        .map_err(|e| format!("semaphore: {e}"))?
    };

    // ---------- Register in-flight ----------
    let cancel_flag = Arc::new(AtomicBool::new(false));
    {
        let manager = app.state::<TranscodeManager>();
        manager.in_flight.lock()
        .map_err(|e| format!("lock: {e}"))?
        .insert(key.clone(), cancel_flag.clone());
    }

    // Run the transcode; ensure cleanup happens on every exit path.
    let result = run_transcode(
        &app, &path, &key, &output_path, &cache_dir, &cancel_flag, &on_progress,
    ).await;

    // ---------- Cleanup ----------
    //Binding lock_result first gives it a name, and its lifetime extends to the end of the enclosing block. The guard's destructor runs before manager drops
    {
        let manager = app.state::<TranscodeManager>();
        let lock_result = manager.in_flight.lock();
        if let Ok(mut m) = lock_result {
            m.remove(&key);
        }
    }
    drop(permit);

    result
}

async fn run_transcode(
    app: &tauri::AppHandle,
    path: &str,
    key: &str,
    output_path: &PathBuf,
    cache_dir: &PathBuf,
    cancel_flag: &Arc<AtomicBool>,
    on_progress: &Channel<TranscodeProgress>,
) -> Result<TranscodeResult, String> {
    // ---------- Probe ----------
    let (duration, video_codec, audio_codec) = probe_streams(app, path).await?;

    log::info!(
        "Transcode start: {} (video={}, audio={}, {:.1}s) [{}]",
               path, video_codec, audio_codec, duration, key
    );

    let ffmpeg_path = paths::sidecar_path("openreel-ffmpeg")?;
    log::info!("ffmpeg resolved to: {}", ffmpeg_path.display());

    // ---------- Build argument list ----------
    let mut cmd = Command::new(&ffmpeg_path);
    cmd.args([
        "-hide_banner",
        "-loglevel", "error",
        "-i", path,
        "-map", "0:v:0",
        "-map", "0:a:0",
    ]);

    // ---------- Video codec ----------
    // H.264 and HEVC bitstreams are MP4-compatible — copy them.
    // Everything else (VC-1, MPEG-2, …) must be re-encoded.
    let video_copy = matches!(video_codec.as_str(), "h264" | "hevc");
    if video_copy {
        cmd.args(["-c:v", "copy"]);
    } else {
        cmd.args([
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-pix_fmt", "yuv420p",
        ]);
    }

    // ---------- Audio codec ----------
    // AAC is MP4-compatible — copy it. Everything else (AC-3, DTS,
    // FLAC, Vorbis, …) must be re-encoded to AAC. Re-encoding audio
    // is the difference between a 7-second remux and a 2-minute
    // transcode; only pay it when the source requires it.
    let audio_copy = matches!(audio_codec.as_str(), "aac" | "mp3");
    if audio_copy {
        cmd.args(["-c:a", "copy"]);
    } else {
        cmd.args(["-c:a", "aac", "-b:a", "192k"]);
    }

    // ---------- Output ----------
    cmd.args([
        "-movflags", "+faststart",
        "-progress", "pipe:2",
        "-y",
        output_path.to_str().unwrap_or(""),
    ]);
    cmd.stdin(Stdio::null());
    cmd.stdout(Stdio::null());
    cmd.stderr(Stdio::piped());

    log::info!(
        "Transcode plan: video={} audio={} ({})",
               if video_copy { "copy" } else { "libx264" },
                   if audio_copy { "copy" } else { "aac" },
                       if video_copy && audio_copy { "fast remux" } else { "re-encode" },
    );

    // ---------- Spawn ----------
    let mut child = cmd.spawn()
    .map_err(|e| format!("spawn ffmpeg: {e}"))?;

    let stderr = child.stderr.take()
    .ok_or("no stderr from ffmpeg")?;

    // ---------- Stderr drain task ----------
    // FFmpeg writes progress to stderr. If nobody drains the pipe
    // fast enough, FFmpeg blocks on write() and the transcode stalls.
    // A dedicated task reads continuously into an unbounded channel;
    // the main loop consumes at its own pace.
    let (line_tx, mut line_rx) = tokio::sync::mpsc::unbounded_channel::<String>();
    tokio::spawn(async move {
        let mut reader = BufReader::new(stderr).lines();
        loop {
            match reader.next_line().await {
                Ok(Some(line)) => {
                    if line_tx.send(line).is_err() {
                        break;
                    }
                }
                Ok(None) => break,
                 Err(_) => break,
            }
        }
    });

    let mut last_seconds = 0.0f64;
    let mut last_speed = 0.0f64;

    // ---------- Progress loop ----------
    loop {
        if cancel_flag.load(Ordering::Relaxed) {
            let _ = child.kill().await;
            let _ = std::fs::remove_file(output_path);
            log::info!("Transcode cancelled: {path}");
            return Err("transcode cancelled".into());
        }

        match line_rx.recv().await {
            Some(line) => {
                if let Some(value) = line.strip_prefix("out_time_us=") {
                    if let Ok(us) = value.trim().parse::<i64>() {
                        last_seconds = us as f64 / 1_000_000.0;
                        let percent = if duration > 0.0 {
                            (last_seconds / duration).min(1.0)
                        } else { 0.0 };
                        let _ = on_progress.send(TranscodeProgress {
                            processed_seconds: last_seconds,
                            total_seconds: duration,
                            percent,
                            speed: last_speed,
                        });
                    }
                } else if let Some(value) = line.strip_prefix("speed=") {
                    let trimmed = value.trim().trim_end_matches('x');
                    if let Ok(s) = trimmed.parse::<f64>() {
                        last_speed = s;
                    }
                } else if line.starts_with("progress=end") {
                    break;
                }
            }
            None => break, // drain task finished — stderr closed
        }
    }

    // ---------- Wait ----------
    let status = child.wait().await
    .map_err(|e| format!("wait ffmpeg: {e}"))?;

    if !status.success() {
        let _ = std::fs::remove_file(output_path);
        log::error!("ffmpeg exited {:?} for {path}", status.code());
        return Err(format!("ffmpeg exited {:?}", status.code().unwrap_or(-1)));
    }

    let _ = on_progress.send(TranscodeProgress {
        processed_seconds: duration,
        total_seconds: duration,
        percent: 1.0,
        speed: last_speed,
    });

    log::info!("Transcode complete: {}", output_path.display());
    log::info!("Dispatch transcode for alternative tracks");

    // ---------- Extract alternate tracks ----------
    // Runs in the background after the main transcode. The main
    // {key}.mp4 is already playable; alternates are for track selection.
    if let Ok(probe) = probe_source(app, path).await {
        let _ = extract_alternates(
            app, path, key, &probe, cancel_flag, &cache_dir,
        ).await;
    }

    Ok(TranscodeResult {
        output_path: output_path.to_string_lossy().to_string(),
       duration,
       cached: false,
    })
}

async fn extract_alternates(
    app: &tauri::AppHandle,
    path: &str,
    key: &str,
    probe: &ProbeResult,
    cancel_flag: &Arc<AtomicBool>,
    cache_dir: &PathBuf,
) -> Result<(), String> {
    let ffmpeg_path = paths::sidecar_path("openreel-ffmpeg")?;
    log::info!("ffmpeg resolved to: {}", ffmpeg_path.display());

    // Partition streams by kind, preserving input order.
    let video_streams: Vec<&StreamInfo> = probe.streams.iter()
    .filter(|s| s.kind == StreamKind::Video && !s.is_attached_pic)
    .collect();
    let audio_streams: Vec<&StreamInfo> = probe.streams.iter()
    .filter(|s| s.kind == StreamKind::Audio)
    .collect();
    let subtitle_streams: Vec<&StreamInfo> = probe.streams.iter()
    .filter(|s| s.kind == StreamKind::Subtitle)
    .collect();

    let video_copyable = matches!(probe.streams.iter()
    .find(|s| s.kind == StreamKind::Video && !s.is_attached_pic)
    .map(|s| s.codec.as_str())
    .unwrap_or(""), "h264" | "hevc");

    let audio_codec = probe.streams.iter()
    .find(|s| s.kind == StreamKind::Audio)
    .map(|s| s.codec.as_str())
    .unwrap_or("");

    let audio_copyable = matches!(audio_codec, "aac" | "mp3");

    if !video_copyable || !audio_copyable {
        log::info!("Skipping alternate track extraction: source requires re-encoding");
        return Ok(());
    }

    // Alternate audio: video 0 + audio N (N >= 1).
    for (i, _audio) in audio_streams.iter().enumerate().skip(1) {
        if cancel_flag.load(Ordering::Relaxed) { return Ok(()); }

        let out_path = cache_dir.join(format!("{key}.a{i}.mp4"));
        if out_path.exists() { continue; }

        let mut cmd = Command::new(&ffmpeg_path);
        cmd.args([
            "-hide_banner",
            "-loglevel", "error",
            "-i", path,
            "-map", "0:v:0",
            "-map", &format!("0:a:{i}"),
                 "-c:v", "copy",
                 "-c:a", "copy",
                 "-movflags", "+faststart",
                 "-y",
                 out_path.to_str().unwrap_or(""),
        ]);
        cmd.stdin(Stdio::null());
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::null());

        match cmd.status().await {
            Ok(s) if s.success() => {
                log::info!("Extracted alternate audio {} -> {}", i, out_path.display());
            }
            Ok(s) => log::warn!("Alternate audio {} extraction failed: {:?}", i, s.code()),
            Err(e) => log::warn!("Alternate audio {} spawn failed: {}", i, e),
        }
    }

    // Alternate video: video N + audio 0 (N >= 1).
    for (i, _video) in video_streams.iter().enumerate().skip(1) {
        if cancel_flag.load(Ordering::Relaxed) { return Ok(()); }

        let out_path = cache_dir.join(format!("{key}.v{i}.mp4"));
        if out_path.exists() { continue; }

        let mut cmd = Command::new(&ffmpeg_path);
        cmd.args([
            "-hide_banner",
            "-loglevel", "error",
            "-i", path,
            "-map", &format!("0:v:{i}"),
                 "-map", "0:a:0",
                 "-c:v", "copy",
                 "-c:a", "copy",
                 "-movflags", "+faststart",
                 "-y",
                 out_path.to_str().unwrap_or(""),
        ]);
        cmd.stdin(Stdio::null());
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::null());

        if let Err(e) = cmd.status().await {
            log::warn!("Alternate video {} spawn failed: {}", i, e);
        }
    }

    // Subtitles: each to a VTT file.
    for (i, _sub) in subtitle_streams.iter().enumerate() {
        if cancel_flag.load(Ordering::Relaxed) { return Ok(()); }

        let out_path = cache_dir.join(format!("{key}.s{i}.vtt"));
        if out_path.exists() { continue; }

        let mut cmd = Command::new(&ffmpeg_path);
        cmd.args([
            "-hide_banner",
            "-loglevel", "error",
            "-i", path,
            "-map", &format!("0:s:{i}"),
                 "-f", "webvtt",
                 "-y",
                 out_path.to_str().unwrap_or(""),
        ]);
        cmd.stdin(Stdio::null());
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::null());

        if let Err(e) = cmd.status().await {
            log::warn!("Subtitle {} extraction failed: {}", i, e);
        }
    }

    Ok(())
}
// ============================================================
// Cancel command
// ============================================================

#[tauri::command]
pub async fn cancel_transcode(
    app: tauri::AppHandle,
    path: String,
) -> Result<(), String> {
    let source = PathBuf::from(&path);
    let meta = std::fs::metadata(&source)
    .map_err(|e| format!("stat: {e}"))?;
    let mtime = meta.modified().ok()
    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
    .map(|d| d.as_secs())
    .unwrap_or(0);
    let key = format!("{:016x}", hash_key(&path, mtime, meta.len()));

    let manager = app.state::<TranscodeManager>();
    let in_flight = manager.in_flight.lock()
    .map_err(|e| format!("lock: {e}"))?;
    if let Some(flag) = in_flight.get(&key) {
        flag.store(true, Ordering::Relaxed);
        log::info!("Cancellation requested for {path}");
    }
    Ok(())
}

// ============================================================
// Helpers
// ============================================================

fn hash_key(path: &str, mtime: u64, size: u64) -> u64 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let mut h = DefaultHasher::new();
    path.hash(&mut h);
    mtime.hash(&mut h);
    size.hash(&mut h);
    h.finish()
}

async fn probe_duration(
    app: &tauri::AppHandle,
    path: &str,
) -> Option<f64> {
    probe_streams(app, path).await.ok().map(|(d, _, _)| d)
}

async fn probe_streams(
    app: &tauri::AppHandle,
    path: &str,
) -> Result<(f64, String, String), String> {
    // Diagnostic: log what the app thinks its paths are.

    let ffprobe_path = paths::sidecar_path("openreel-ffprobe")?;
    log::info!("ffprobe resolved to: {}", ffprobe_path.display());

    let output = Command::new(&ffprobe_path)
    .args([
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ])
    .output()
    .await
    .map_err(|e| format!("spawn ffprobe: {e}"))?;

    if !output.status.success() {
        return Err("ffprobe failed".into());
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
    .map_err(|e| format!("parse ffprobe: {e}"))?;

    let duration = json
    .get("format")
    .and_then(|f| f.get("duration"))
    .and_then(|d| d.as_str())
    .and_then(|s| s.parse::<f64>().ok())
    .unwrap_or(0.0);

    let mut video_codec = String::new();
    let mut audio_codec = String::new();
    if let Some(streams) = json.get("streams").and_then(|s| s.as_array()) {
        for s in streams {
            match s.get("codec_type").and_then(|t| t.as_str()) {
                Some("video") if video_codec.is_empty() => {
                    video_codec = s.get("codec_name")
                    .and_then(|c| c.as_str())
                    .unwrap_or("").to_string();
                }
                Some("audio") if audio_codec.is_empty() => {
                    audio_codec = s.get("codec_name")
                    .and_then(|c| c.as_str())
                    .unwrap_or("").to_string();
                }
                _ => {}
            }
        }
    }

    Ok((duration, video_codec, audio_codec))
}

/*
 *The is_attached_pic filter matters for audio files with cover art.
 * An MP3 has a "video" stream for the album art.
 * It has no codec_type: subtitle streams and only one audio.
 * The extraction loop must skip is_attached_pic video streams — extracting them would produce a useless 400×250 one-frame MP4.
 */
async fn probe_source(app: &tauri::AppHandle, path: &str) -> Result<ProbeResult, String> {
    let ffprobe_path = paths::sidecar_path("openreel-ffprobe")?;
    log::info!("ffprobe resolved to: {}", ffprobe_path.display());

    let output = Command::new(&ffprobe_path)
    .args([
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ])
    .output()
    .await
    .map_err(|e| format!("spawn ffprobe: {e}"))?;

    if !output.status.success() {
        return Err("ffprobe failed".into());
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
    .map_err(|e| format!("parse ffprobe: {e}"))?;

    let duration = json
    .get("format")
    .and_then(|f| f.get("duration"))
    .and_then(|d| d.as_str())
    .and_then(|s| s.parse::<f64>().ok())
    .unwrap_or(0.0);

    let mut streams = Vec::new();
    if let Some(arr) = json.get("streams").and_then(|s| s.as_array()) {
        for s in arr {
            let kind = match s.get("codec_type").and_then(|t| t.as_str()) {
                Some("video") => StreamKind::Video,
                Some("audio") => StreamKind::Audio,
                Some("subtitle") => StreamKind::Subtitle,
                _ => continue,
            };

            let is_attached_pic = s
            .get("disposition")
            .and_then(|d| d.get("attached_pic"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0) == 1;

            let is_default = s
            .get("disposition")
            .and_then(|d| d.get("default"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0) == 1;

            let is_forced = s
            .get("disposition")
            .and_then(|d| d.get("forced"))
            .and_then(|v| v.as_i64())
            .unwrap_or(0) == 1;

            streams.push(StreamInfo {
                index: s.get("index").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                kind,
                codec: s.get("codec_name").and_then(|c| c.as_str()).unwrap_or("").to_string(),
                language: s.get("tags")
                .and_then(|t| t.get("language"))
                .and_then(|l| l.as_str())
                .map(|s| s.to_string()),
                title: s.get("tags")
                .and_then(|t| t.get("title"))
                .and_then(|l| l.as_str())
                .map(|s| s.to_string()),
                is_default,
                is_forced,
                is_attached_pic,
            });
        }
    }

    Ok(ProbeResult { duration, streams })
}

#[tauri::command]
pub async fn list_extracted_tracks(
    app: tauri::AppHandle,
    path: String,
) -> Result<ExtractedTracks, String> {
    // Recompute the key. This must match prepare_transcode's key exactly.
    let meta = std::fs::metadata(&path).map_err(|e| format!("stat: {e}"))?;
    let mtime = meta.modified().ok()
    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
    .map(|d| d.as_secs())
    .unwrap_or(0);
    let key = format!("{:016x}", hash_key(&path, mtime, meta.len()));

    let cache_dir = crate::paths::transcode_cache_dir(&app);
    let probe = probe_source(&app, &path).await?;

    let port = app.state::<http_server::ServerAddr>().0;
    let base = format!("http://127.0.0.1:{port}/stream?path=");

    let mut audio = Vec::new();
    let mut subtitles = Vec::new();
    let mut videos = Vec::new();

    let audio_streams: Vec<&StreamInfo> = probe.streams.iter()
    .filter(|s| s.kind == StreamKind::Audio).collect();
    let subtitle_streams: Vec<&StreamInfo> = probe.streams.iter()
    .filter(|s| s.kind == StreamKind::Subtitle).collect();
    let video_streams: Vec<&StreamInfo> = probe.streams.iter()
    .filter(|s| s.kind == StreamKind::Video && !s.is_attached_pic).collect();

    for (i, s) in audio_streams.iter().enumerate() {
        let file = if i == 0 {
            cache_dir.join(format!("{key}.mp4"))
        } else {
            cache_dir.join(format!("{key}.a{i}.mp4"))
        };
        if !file.exists() { continue; }
        let encoded = urlencoding::encode(&file.to_string_lossy()).into_owned();
        audio.push(ExtractedTrack {
            index: s.index,
            language: s.language.clone(),
            title: s.title.clone(),
            is_default: s.is_default,
            is_forced: s.is_forced,
            codec: s.codec.clone(),
            url: format!("{base}{encoded}"),
        });
    }

    for (i, s) in subtitle_streams.iter().enumerate() {
        let file = cache_dir.join(format!("{key}.s{i}.vtt"));
        if !file.exists() { continue; }
        let encoded = urlencoding::encode(&file.to_string_lossy()).into_owned();
        subtitles.push(ExtractedTrack {
            index: s.index,
            language: s.language.clone(),
            title: s.title.clone(),
            is_default: s.is_default,
            is_forced: s.is_forced,
            codec: s.codec.clone(),
            url: format!("{base}{encoded}"),
        });
    }

    for (i, s) in video_streams.iter().enumerate() {
        let file = if i == 0 {
            cache_dir.join(format!("{key}.mp4"))
        } else {
            cache_dir.join(format!("{key}.v{i}.mp4"))
        };
        if !file.exists() { continue; }
        let encoded = urlencoding::encode(&file.to_string_lossy()).into_owned();
        videos.push(ExtractedTrack {
            index: s.index,
            language: s.language.clone(),
            title: s.title.clone(),
            is_default: s.is_default,
            is_forced: s.is_forced,
            codec: s.codec.clone(),
            url: format!("{base}{encoded}"),
        });
    }

    Ok(ExtractedTracks { audio, subtitles, videos })
}
