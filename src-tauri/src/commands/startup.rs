use std::sync::Mutex;

pub struct StartupFiles {
    pub paths: Mutex<Vec<String>>,
}

#[tauri::command]
pub async fn get_startup_files(
    app: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    use tauri::Manager;
    let state = app.state::<StartupFiles>();
    let mut paths = state.paths.lock().map_err(|e| format!("lock: {e}"))?;
    Ok(std::mem::take(&mut *paths))
}
