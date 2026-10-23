// src-tauri/src/audio_engine.rs
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;

pub struct AudioEngine {
    /// Set to true while the stream callback should output samples.
    pub playing: Arc<AtomicBool>,
    /// Current playback position in samples.
    pub position: Arc<AtomicU64>,
    /// Total samples in the decoded buffer.
    pub total: Arc<AtomicU64>,
    /// Stop signal for the decode thread.
    pub stop: Arc<AtomicBool>,
}

impl AudioEngine {
    /// Decode `path` with symphonia into an f32 buffer, then stream it
    /// to `device_name` (or the default device if None).
    pub fn play(
        path: &str,
        device_name: Option<&str>,
    ) -> Result<Self, String> {
        let samples = decode_to_f32(path)?;
        let total = samples.len() as u64;

        let host = cpal::default_host();
        let device = match device_name {
            Some(name) => host
                .output_devices()
                .map_err(|e| format!("enumerate: {e}"))?
                .find(|d| d.name().ok().as_deref() == Some(name))
                .ok_or_else(|| format!("device not found: {name}"))?,
            None => host
                .default_output_device()
                .ok_or("no default output device")?,
        };

        let config = device
            .default_output_config()
            .map_err(|e| format!("default config: {e}"))?;

        let sample_rate = config.sample_rate().0;
        let channels = config.channels() as usize;

        // Resample if the device rate differs from the decoded rate.
        // symphonia gives us the source rate; for the demo, assume
        // they match (most files are 44.1/48k, most devices accept both).
        // A real implementation would resample with `rubato`.

        let samples = Arc::new(samples);
        let playing = Arc::new(AtomicBool::new(true));
        let position = Arc::new(AtomicU64::new(0));
        let total_arc = Arc::new(AtomicU64::new(total));
        let stop = Arc::new(AtomicBool::new(false));

        let samples_clone = samples.clone();
        let playing_clone = playing.clone();
        let position_clone = position.clone();
        let stop_clone = stop.clone();

        let stream = device
            .build_output_stream(
                &config.into(),
                move |data: &mut [f32], _| {
                    if stop_clone.load(Ordering::Relaxed) {
                        data.fill(0.0);
                        return;
                    }
                    if !playing_clone.load(Ordering::Relaxed) {
                        data.fill(0.0);
                        return;
                    }
                    let pos = position_clone.load(Ordering::Relaxed) as usize;
                    for (i, sample) in data.iter_mut().enumerate() {
                        let src_idx = pos + i / channels;
                        *sample = samples_clone.get(src_idx).copied().unwrap_or(0.0);
                    }
                    position_clone.store((pos + data.len()) as u64, Ordering::Relaxed);
                },
                |err| eprintln!("audio stream error: {err}"),
                None,
            )
            .map_err(|e| format!("build stream: {e}"))?;

        stream.play().map_err(|e| format!("play stream: {e}"))?;

        // The stream must stay alive. Store it in the engine and let
        // the caller keep the engine.
        std::mem::forget(stream); // ← placeholder; real impl stores it

        Ok(Self {
            playing,
            position,
            total: total_arc,
            stop,
        })
    }
}

fn decode_to_f32(_path: &str) -> Result<Vec<f32>, String> {
    // symphonia decode loop: probe → decoder → packets → f32 samples.
    // ~60 lines. Omitted here for brevity; the pattern is in
    // `playback-rs` and every symphonia example.
    unimplemented!("symphonia decode")
}
