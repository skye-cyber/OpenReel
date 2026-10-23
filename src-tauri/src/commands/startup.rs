use std::sync::Mutex;
use std::path::PathBuf;


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


/// Resolve a potentially-relative path to an absolute one using the
/// process's current working directory as the anchor.
///
/// Returns the input unchanged if it's already absolute or if the
/// current directory can't be read (in which case the caller sees the
/// same relative-path failure they had before — but no worse).
pub fn absolutize(path: String) -> String {
    let p = PathBuf::from(&path);
    if p.is_absolute() {
        return path;
    }
    match std::env::current_dir() {
        Ok(cwd) => cwd.join(p).to_string_lossy().to_string(),
        Err(_) => path,
    }
}
