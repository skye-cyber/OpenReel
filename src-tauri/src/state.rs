// CACHE is now tauri owned so this file is no longer neccessary
use crate::commands::library::LibraryCache;
use std::sync::{Mutex, OnceLock};

static LIBRARY_CACHE: OnceLock<LibraryCache> = OnceLock::new();

pub fn get_library_cache() -> &'static LibraryCache {
    LIBRARY_CACHE.get_or_init(|| LibraryCache {
        index: Mutex::new(None),
        scan_id: Mutex::new(None),
    })
}
