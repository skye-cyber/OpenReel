use serde::Serialize;
use std::sync::Mutex;

pub struct StartupFiles {
    pub paths: Mutex<Vec<String>>,
}

#[tauri::command]
pub async fn get_startup_files(
    state: tauri::State<'_, StartupFiles>,
    app: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    // If empty, wait up to 2s for startup init to complete.
    for _ in 0..20 {
        {
            let mut paths = state.paths.lock().map_err(|e| format!("lock: {e}"))?;
            if !paths.is_empty() {
                return Ok(std::mem::take(&mut *paths));
            }
            // Sentinel: has setup run?
            if let Ok(true) = state.initialized.lock() {
                return Ok(Vec::new());
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    Ok(Vec::new())
}
