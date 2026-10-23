use tauri_plugin_dialog::DialogExt;

/// Media file extensions OpenReel recognizes. Used to filter the picker.
/// Kept broad — the core player rejects files it can't decode, but the
/// picker shouldn't hide formats the user might have an extension for.
const MEDIA_EXTENSIONS: &[&str] = &[
    // Containers with video
    "mkv", "mp4", "m4v", "webm", "mov", "avi", "flv", "wmv", "ogv", "ts", "m2ts", "mts", "3gp",
    // Audio containers
    "mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "wma", "aiff", "aif",
    // Subtitle files
    "srt", "vtt", "ass", "ssa", "sub",
];


/// Pick a single media file using the native dialog.
///
/// The dialog is filtered to OpenReel's supported extensions but allows
/// "All files" so the user can select anything the OS lets them see.
/// Returns `None` if the user cancels.
#[tauri::command]
pub async fn pick_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
    .file()
    .add_filter("Media files", MEDIA_EXTENSIONS)
    .add_filter("All files", &["*"])
    .pick_file(move |path| {
        let _ = tx.send(path);
    });
    let result = rx.recv().map_err(|e| format!("dialog recv: {e}"))?;
    Ok(result.map(|p| p.to_string()))
}

/// Pick one or more media files using the native dialog.
///
/// Same filter as `pick_file`. Returns an empty vector if the user
/// cancels, so callers can treat "nothing picked" as `files.is_empty()`.
#[tauri::command]
pub async fn pick_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
    .file()
    .add_filter("Media files", MEDIA_EXTENSIONS)
    .add_filter("All files", &["*"])
    .pick_files(move |paths| {
        let _ = tx.send(paths);
    });
    let result = rx.recv().map_err(|e| format!("dialog recv: {e}"))?;
    Ok(result
    .unwrap_or_default()
    .into_iter()
    .map(|p| p.to_string())
    .collect())
}
#[tauri::command]
pub async fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .pick_folder(move |path| { let _ = tx.send(path); });
    let result = rx.recv().map_err(|e| format!("dialog: {e}"))?;
    Ok(result.map(|p| p.to_string()))
    // Ok(result.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn save_file_bytes(path: String, bytes: Vec<u8>) -> Result<(), String> {
    // Ensure the parent directory exists. The save dialog usually
    // guarantees this, but a race or a manual path could miss it.
    let path_buf = std::path::PathBuf::from(&path);
    if let Some(parent) = path_buf.parent() {
        std::fs::create_dir_all(parent)
        .map_err(|e| format!("create dir: {e}"))?;
    }

    std::fs::write(&path_buf, bytes)
    .map_err(|e| format!("write {}: {e}", path_buf.display()))?;

    log::info!("Wrote {} bytes to {}", path_buf.display(), path_buf.metadata().map(|m| m.len()).unwrap_or(0));
    Ok(())
}
