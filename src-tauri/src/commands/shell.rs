use tauri_plugin_opener::OpenerExt;


#[tauri::command]
pub async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.opener()
    .open_url(&url, None::<&str>)
    .map_err(|e| format!("open url: {e}"))
}

#[tauri::command]
pub async fn open_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.opener()
    .open_path(&path, None::<&str>)
    .map_err(|e| format!("open path: {e}"))
}

#[tauri::command]
pub async fn check_for_updates() -> Result<serde_json::Value, String> {
    // TODO: wire tauri-plugin-updater. Return "no update available" for now.
    Ok(serde_json::json!({ "available": false }))
}
