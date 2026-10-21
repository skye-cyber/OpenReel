use serde::Serialize;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

const MAX_AGE_DAYS: u64 = 7;
const MAX_SIZE_BYTES: u64 = 5 * 1024 * 1024 * 1024;
const MIN_AGE_SECONDS: u64 = 24 * 60 * 60;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheSweepResult {
    pub files_deleted_by_age: usize,
    pub files_deleted_by_size: usize,
    pub bytes_freed: u64,
    pub remaining_files: usize,
    pub remaining_bytes: u64,
}

struct Entry {
    path: PathBuf,
    size: u64,
    modified: SystemTime,
}

pub fn sweep_transcode_cache(app: &tauri::AppHandle) -> Result<CacheSweepResult, String> {
    let cache_dir = crate::paths::transcode_cache_dir(app);
    if !cache_dir.exists() {
        return Ok(CacheSweepResult {
            files_deleted_by_age: 0,
            files_deleted_by_size: 0,
            bytes_freed: 0,
            remaining_files: 0,
            remaining_bytes: 0,
        });
    }

    let now = SystemTime::now();
    let max_age = Duration::from_secs(MAX_AGE_DAYS * 24 * 60 * 60);
    let min_age = Duration::from_secs(MIN_AGE_SECONDS);

    let mut entries: Vec<Entry> = Vec::new();
    let mut deleted_by_age = 0usize;
    let mut bytes_freed_by_age = 0u64;

    for entry in std::fs::read_dir(&cache_dir)
        .map_err(|e| format!("read cache dir: {e}"))?
        .filter_map(|e| e.ok())
        {
            let path = entry.path();
            let meta = match entry.metadata() {
                Ok(m) if m.is_file() => m,
                _ => continue,
            };
            let modified = meta.modified().unwrap_or(now);
            let age = now.duration_since(modified).unwrap_or_default();

            if age < min_age {
                entries.push(Entry { path, size: meta.len(), modified });
                continue;
            }

            if age > max_age {
                match std::fs::remove_file(&path) {
                    Ok(_) => {
                        deleted_by_age += 1;
                        bytes_freed_by_age += meta.len();
                    }
                    Err(e) => {
                        log::warn!("Failed to remove stale cache file {}: {e}", path.display());
                        entries.push(Entry { path, size: meta.len(), modified });
                    }
                }
            } else {
                entries.push(Entry { path, size: meta.len(), modified });
            }
        }

        let mut total: u64 = entries.iter().map(|e| e.size).sum();
        let mut deleted_by_size = 0usize;
        let mut bytes_freed_by_size = 0u64;

        if total > MAX_SIZE_BYTES {
            entries.sort_by(|a, b| a.modified.cmp(&b.modified));
            let mut to_remove: Vec<usize> = Vec::new();
            for (i, entry) in entries.iter().enumerate() {
                if total <= MAX_SIZE_BYTES {
                    break;
                }
                let age = now.duration_since(entry.modified).unwrap_or_default();
                if age < min_age {
                    continue;
                }
                match std::fs::remove_file(&entry.path) {
                    Ok(_) => {
                        total = total.saturating_sub(entry.size);
                        deleted_by_size += 1;
                        bytes_freed_by_size += entry.size;
                        to_remove.push(i);
                    }
                    Err(e) => {
                        log::warn!("Failed to remove cache file {}: {e}", entry.path.display());
                    }
                }
            }
            // Remove deleted entries from the list (reverse order preserves indices).
            for i in to_remove.into_iter().rev() {
                entries.remove(i);
            }
        }

        let remaining_files = entries.len();
        let remaining_bytes = entries.iter().map(|e| e.size).sum();
        let bytes_freed = bytes_freed_by_age + bytes_freed_by_size;

        log::info!(
            "Cache sweep: age-deleted={}, size-deleted={}, freed={} bytes, remaining={} files / {} bytes",
            deleted_by_age,
            deleted_by_size,
            bytes_freed,
            remaining_files,
            remaining_bytes,
        );

        Ok(CacheSweepResult {
            files_deleted_by_age: deleted_by_age,
            files_deleted_by_size: deleted_by_size,
            bytes_freed,
            remaining_files,
            remaining_bytes,
        })
}

#[tauri::command]
pub async fn sweep_cache_manual(
    app: tauri::AppHandle,
) -> Result<CacheSweepResult, String> {
    sweep_transcode_cache(&app)
}

/// Return current cache usage without deleting anything.
#[tauri::command]
pub async fn get_cache_usage(
    app: tauri::AppHandle,
) -> Result<CacheUsage, String> {
    let cache_dir = crate::paths::transcode_cache_dir(&app);
    if !cache_dir.exists() {
        return Ok(CacheUsage { file_count: 0, total_bytes: 0 });
    }

    let mut count = 0usize;
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(&cache_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    count += 1;
                    total += meta.len();
                }
            }
        }
    }
    Ok(CacheUsage { file_count: count, total_bytes: total })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheUsage {
    pub file_count: usize,
    pub total_bytes: u64,
}
