use serde_json::Value;
use tauri::AppHandle;

use crate::paths;

/// Read the persisted settings JSON from ~/.openreel/config/settings.json.
///
/// Returns `Value::Null` when the file does not exist. The frontend
/// treats null as "use defaults" — this is the first-launch path.
#[tauri::command]
pub async fn read_settings(app: AppHandle) -> Result<Value, String> {
    let path = paths::settings_file(&app);
    if !path.exists() {
        return Ok(Value::Null);
    }
    let raw = std::fs::read_to_string(&path)
        .map_err(|e| format!("read {}: {e}", path.display()))?;
    serde_json::from_str(&raw)
        .map_err(|e| format!("parse {}: {e}", path.display()))
}

/// Write settings to ~/.openreel/config/settings.json.
///
/// Writes to a temp file in the same directory, then renames it into
/// place. Rename is atomic on the same filesystem, so a crash during the
/// write leaves the previous file intact. This is why we don't just call
/// `fs::write` directly.
#[tauri::command]
pub async fn write_settings(app: AppHandle, data: Value) -> Result<(), String> {
    let path = paths::settings_file(&app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
    }

    let serialized = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("serialize: {e}"))?;

    // Temp file next to the target, same directory → same filesystem,
    // so `rename` is atomic.
    let tmp = path.with_extension("json.tmp");
    std::fs::write(&tmp, &serialized)
        .map_err(|e| format!("write {}: {e}", tmp.display()))?;
    std::fs::rename(&tmp, &path)
        .map_err(|e| format!("rename {} → {}: {e}", tmp.display(), path.display()))?;

    log::info!("Settings written ({} bytes)", serialized.len());
    Ok(())
}

#[tauri::command]
pub fn reset_settings(app: AppHandle) -> Result<(), String> {
    let folders = paths::default_media_folders();
    let folders_json = serde_json::to_string(&folders)
    .unwrap_or_else(|_| "[]".to_string());

    let content = format!(
        "{{\n  \"v\": 1,\n  \"themePref\": \"system\",\n  \"vol\": 0.72,\n  \"muted\": false,\n  \"speed\": 1,\n  \"plugins\": {{}},\n  \"settings\": {{}},\n  \"libraryMeta\": {{ \"folders\": {}, \"itemCount\": 0, \"lastScanAt\": null }},\n  \"libraryFolders\": {},\n  \"repositories\": [],\n  \"subTrack\": 0\n,\n  \"subTrack\": []\n}}\n",
        folders.len(),
                          folders_json,
    );

    let path = paths::settings_file(&app);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
        .map_err(|e| format!("create dir {}: {e}", parent.display()))?;
    }
    std::fs::write(&path, content)
    .map_err(|e| format!("write {}: {e}", path.display()))?;
    log::info!("Settings reset successfully");
    Ok(())
}

/// Return the base data directory (~/.openreel).
///
/// Used by the Settings → Advanced "Open config folder" button and by
/// About → Diagnostics to display the path.
#[tauri::command]
pub fn get_base_dir(app: AppHandle) -> String {
    paths::base_dir(&app).to_string_lossy().to_string()
}
