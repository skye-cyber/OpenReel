use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::Semaphore;

pub struct TranscodeManager {
    /// Semaphore limiting concurrent FFmpeg processes.
    semaphore: Semaphore,
    /// In-flight jobs by source hash.
    jobs: Mutex<HashMap<String, JobHandle>>,
}

struct JobHandle {
    /// Cancellation flag — checked before each progress read.
    cancelled: Arc<AtomicBool>,
    /// The output path once complete, populated by the job.
    result: Arc<tokio::sync::OnceCell<TranscodeResult>>,
}

impl TranscodeManager {
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            semaphore: Semaphore::new(max_concurrent),
            jobs: Mutex::new(HashMap::new()),
        }
    }
}
