use serde::Serialize;

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
pub async fn read_log_tail(
    app: tauri::AppHandle,
    lines: Option<usize>,
) -> Result<LogTail, String> {
    use std::io::{BufRead, BufReader};
    use tauri::Manager;

    let max_lines = lines.unwrap_or(200).min(1000);

    let log_dir = app
    .path()
    .app_log_dir()
    .map_err(|e| format!("log dir: {e}"))?;

    // tauri-plugin-log writes to <app_log_dir>/openreel.log by default
    // when file_name is "openreel". Some versions append a .log.
    let log_path = {
        let candidates = [
            log_dir.join("openreel.log"),
            log_dir.join("openreel"),
        ];
        candidates
        .iter()
        .find(|p| p.exists())
        .cloned()
        .unwrap_or_else(|| log_dir.join("openreel.log"))
    };

    if !log_path.exists() {
        return Ok(LogTail {
            lines: Vec::new(),
                  path: log_path.to_string_lossy().to_string(),
                  error: Some("Log file not created yet".into()),
        });
    }

    let file = std::fs::File::open(&log_path)
    .map_err(|e| format!("open log: {e}"))?;

    // Read all lines, keep the last N.
    // For very large logs this is wasteful — good enough for a demo.
    let reader = BufReader::new(file);
    let all: Vec<String> = reader
    .lines()
    .filter_map(|l| l.ok())
    .collect();

    let start = all.len().saturating_sub(max_lines);
    let tail: Vec<LogLine> = all[start..]
    .iter()
    .filter_map(|raw| parse_log_line(raw))
    .collect();

    Ok(LogTail {
        lines: tail,
       path: log_path.to_string_lossy().to_string(),
       error: None,
    })
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
