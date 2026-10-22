use serde::Serialize;
use std::io::{Read, Seek, SeekFrom};
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HardwareProbe {
    pub available: bool,
    pub backend: String,
    pub device: String,
    pub codecs: Vec<String>,
    pub unavailable_codecs: Vec<String>,
    // pub error: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub os_version: String,
    pub session: String,
    pub desktop: String,
    pub gpu: String,
    pub audio_backend: String,
    pub display_scaling: f64,
}


#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogLine {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogTail {
    pub lines: Vec<LogLine>,
    pub path: String,
    pub error: Option<String>,
}


#[tauri::command]
pub async fn probe_hardware_decoding() -> Result<HardwareProbe, String> {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        let gpu = detect_gpu_internal();

        // Check if vainfo exists before running it.
        let which = Command::new("which").arg("vainfo").output();
        let vainfo_available = matches!(which, Ok(o) if o.status.success());

        if !vainfo_available {
            log::warn!("vainfo not found on PATH; hardware decode probe unavailable");
        }
        if !vainfo_available {
            return Ok(HardwareProbe {
                available: false,
                backend: "VA-API".into(),
                device: gpu,
                codecs: Vec::new(),
                unavailable_codecs: vec![],
                // error:  Some("vainfo package required by openreel is not installed".into())
            });
        }

        let output = Command::new("vainfo").output();

        if let Ok(output) = output {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                let has_h264 = stdout.contains("VAProfileH264");
                let has_vp9 = stdout.contains("VAProfileVP9");
                let has_av1 = stdout.contains("VAProfileAV1");
                let has_hevc = stdout.contains("VAProfileHEVC");

                let mut codecs: Vec<String> = Vec::new();
                let mut unavailable: Vec<String> = Vec::new();
                if has_h264 { codecs.push("h264".into()) } else { unavailable.push("h264".into()) }
                if has_vp9 { codecs.push("vp9".into()) } else { unavailable.push("vp9".into()) }
                if has_av1 { codecs.push("av1".into()) } else { unavailable.push("av1".into()) }
                if has_hevc { codecs.push("hevc".into()) } else { unavailable.push("hevc".into()) }

                log::info!("Hardware decode probe: {} codecs available ({:?})", codecs.len(), codecs);

                return Ok(HardwareProbe {
                    available: true,
                    backend: "VA-API".into(),
                    device: gpu,
                    codecs,
                    unavailable_codecs: unavailable,
                    // error: Some(None),
                });
            }
        }

        return Ok(HardwareProbe {
            available: false,
            backend: String::new(),
            device: gpu,
            codecs: Vec::new(),
            unavailable_codecs: vec!["h264".into(), "hevc".into(), "vp9".into(), "av1".into()],
            // error: Some(None),
        });
    }

    #[cfg(not(target_os = "linux"))]
    {
        Ok(HardwareProbe {
            available: false,
            backend: String::new(),
            device: String::new(),
            codecs: Vec::new(),
            unavailable_codecs: vec!["h264".into(), "hevc".into(), "vp9".into(), "av1".into()],
           // error: Some(None),
        })
    }
}

#[tauri::command]
pub async fn get_platform_info() -> Result<PlatformInfo, String> {
    #[cfg(target_os = "linux")]
    {
        let os_version = std::fs::read_to_string("/etc/os-release")
        .ok()
        .and_then(|s| {
            s.lines()
            .find(|l| l.starts_with("PRETTY_NAME="))
            .map(|l| l.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string())
        })
        .unwrap_or_else(|| "Linux".into());

        let session = std::env::var("XDG_SESSION_TYPE").unwrap_or_else(|_| "unknown".into());
        let desktop = std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default();

        let uid = unsafe { libc::getuid() };
        let pw_path = format!("/run/user/{}/pipewire-0", uid);
        let pa_path = format!("/run/user/{}/pulse", uid);
        let audio_backend = if std::path::Path::new(&pa_path).exists() {
            "PipeWire".to_string()
        } else if std::path::Path::new(&pa_path).exists() {
            "PulseAudio".to_string()
        } else {
            "ALSA".to_string()
        };

        return Ok(PlatformInfo {
            os: "Linux".into(),
                  os_version,
                  session,
                  desktop,
                  gpu: detect_gpu_internal(),
                  audio_backend,
                  display_scaling: 1.0,
        });
    }

    #[cfg(not(target_os = "linux"))]
    {
        Ok(PlatformInfo {
            os: std::env::consts::OS.into(),
           os_version: String::new(),
           session: "native".into(),
           desktop: String::new(),
           gpu: String::new(),
           audio_backend: String::new(),
           display_scaling: 1.0,
        })
    }
}

// Detect internal GPU
#[cfg(target_os = "linux")]
fn detect_gpu_internal() -> String {
    use std::process::Command;
    if let Ok(output) = Command::new("lspci").output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if line.contains("VGA") || line.contains("3D controller") {
                if let Some(pos) = line.find(": ") {
                    return line[pos + 2..].to_string();
                }
            }
        }
    }
    String::new()
}

#[tauri::command]
pub async fn read_log_tail(
    app: tauri::AppHandle,
    lines: Option<usize>,
) -> Result<LogTail, String> {
    let max_lines = lines.unwrap_or(5000).min(6000);

    // Get log file from path.rs
    let log_path = crate::paths::log_file(&app);

    if !log_path.exists() {
        return Ok(LogTail {
            lines: Vec::new(),
                  path: log_path.to_string_lossy().to_string(),
                  error: Some("Log file not created yet".into()),
        });
    }

    // Open the file and read the last N lines efficiently by seeking
    // from the end. Only the tail is loaded into memory.
    let raw_tail = match read_last_lines(&log_path, max_lines) {
        Ok(lines) => lines,
        Err(e) => {
            return Ok(LogTail {
                lines: Vec::new(),
                      path: log_path.to_string_lossy().to_string(),
                      error: Some(format!("read log: {e}")),
            });
        }
    };

    let parsed: Vec<LogLine> = raw_tail
    .iter()
    .filter_map(|raw| parse_log_line(raw))
    .collect();

    Ok(LogTail {
        lines: parsed,
       path: log_path.to_string_lossy().to_string(),
       error: None,
    })
}

/// Read the last `count` lines of a file by seeking from the end.
///
/// Returns them in chronological order (oldest first). If the file has
/// fewer than `count` lines, returns the whole file.
///
/// The approach: seek to the end, read backward in chunks until enough
/// newlines are found, then split and trim. Only the tail bytes are
/// held in memory — the rest of the file never leaves disk.
fn read_last_lines(path: &std::path::Path, count: usize) -> std::io::Result<Vec<String>> {
    if count == 0 {
        return Ok(Vec::new());
    }

    let mut file = std::fs::File::open(path)?;
    let file_len = file.metadata()?.len();
    if file_len == 0 {
        return Ok(Vec::new());
    }

    // Chunk size for backward scan. 8 KB is enough for ~50-100 log
    // lines typically, so 200 lines takes 2-3 reads for a modern log
    // format. Increase if your format is more verbose per line.
    const CHUNK: u64 = 8192;

    let mut collected: Vec<u8> = Vec::new();
    let mut pos = file_len;
    let mut newlines_found = 0usize;

    // Scan backward until we've found `count + 1` newlines or hit the
    // start of the file. The +1 accounts for the newline at the very
    // end of the file (if present) which doesn't terminate a real line.
    while pos > 0 && newlines_found < count + 1 {
        let read_size = CHUNK.min(pos);
        pos -= read_size;

        file.seek(SeekFrom::Start(pos))?;
        let mut buf = vec![0u8; read_size as usize];
        file.read_exact(&mut buf)?;

        // Prepend to collected.
        let mut new_collected = Vec::with_capacity(buf.len() + collected.len());
        new_collected.extend_from_slice(&buf);
        new_collected.extend_from_slice(&collected);
        collected = new_collected;

        newlines_found = collected.iter().filter(|&&b| b == b'\n').count();
    }

    let text = String::from_utf8_lossy(&collected);

    // Split into lines, drop the trailing empty entry if the file
    // ends with a newline, take the last `count` lines, and reverse
    // to chronological order.
    let mut all: Vec<&str> = text.split('\n').collect();
    if all.last() == Some(&"") {
        all.pop();
    }

    let start = all.len().saturating_sub(count);
    let tail: Vec<String> = all[start..]
    .iter()
    .filter(|line| !line.trim().is_empty())
    .map(|s| s.to_string())
    .collect();

    Ok(tail)
}

fn parse_log_line(raw: &str) -> Option<LogLine> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }

    // Fast path: exact format [date][time][module][LEVEL] message
    // Split at the first 4 closing brackets.
    let mut rest = trimmed;
    let mut segments: [&str; 4] = [""; 4];
    let mut ok = true;

    for slot in segments.iter_mut() {
        let rest_trimmed = rest.strip_prefix('[')?;
        let close = rest_trimmed.find(']')?;
        *slot = &rest_trimmed[..close];
        rest = &rest_trimmed[close + 1..];
    }

    if !ok {
        return Some(LogLine {
            timestamp: String::new(),
                    level: "?".into(),
                    message: trimmed.to_string(),
        });
    }

    let [date, time, _module, level] = segments;
    let message = rest.trim_start().to_string();

    Some(LogLine {
        timestamp: format!("{date} {time}"),
         level: level.to_string(),
         message,
    })
}
