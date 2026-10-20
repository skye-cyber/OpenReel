use crate::commands::library::ScanCache;
use std::sync::{Mutex, OnceLock};
use std::collections::HashMap;

static SCAN_CACHE: OnceLock<ScanCache> = OnceLock::new();

pub fn get_scan_cache() -> &'static ScanCache {
    SCAN_CACHE.get_or_init(|| ScanCache {
        files: Mutex::new(HashMap::new()),
    })
}
