use cpal::traits::{DeviceTrait, HostTrait};
use serde::Serialize;
use std::sync::Mutex;
use tauri::Manager;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

/// State: selected device id, plus the active stream handle so it can be
/// stopped when the device changes or playback stops.
pub struct AudioState {
    pub selected_device: Mutex<Option<String>>,
}

#[tauri::command]
pub fn list_audio_devices() -> Result<Vec<AudioDevice>, String> {
    let host = cpal::default_host();
    let default_name = host
        .default_output_device()
        .and_then(|d| d.name().ok())
        .unwrap_or_default();

    let devices = host
        .output_devices()
        .map_err(|e| format!("enumerate output devices: {e}"))?;

    let mut out = Vec::new();
    for (i, device) in devices.enumerate() {
        let name = device.name().unwrap_or_else(|_| format!("Device {i}"));
        out.push(AudioDevice {
            id: name.clone(),   // cpal has no stable device id; name is the best key
            is_default: name == default_name,
            name,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn set_audio_device(
    device_name: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let state = app.state::<AudioState>();
    let mut selected = state.selected_device.lock().map_err(|e| format!("lock: {e}"))?;
    *selected = Some(device_name);
    Ok(())
}

#[tauri::command]
pub fn get_audio_device(
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    let state = app.state::<AudioState>();
    let selected = state.selected_device.lock().map_err(|e| format!("lock: {e}"))?;
    Ok(selected.clone())
}
