/**
 * Check for an application update.
 *
 * TODO(tauri): replace with a real update check via tauri-plugin-updater
 * or a fetch to the release endpoint. The return shape stays the same.
 */
export interface UpdateCheckResult {
    available: boolean;
    version?: string;
    url?: string;
    error?: string;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
    return { available: false };
}

/**
 * Open a URL in the system browser.
 *
 * TODO(tauri): invoke('open_url', { url }) using tauri-plugin-shell's
 * open. Returns after the OS accepts the call (does not wait for the
 * browser to load).
 */
export async function openExternal(url: string): Promise<void> {
    if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

/**
 * Open a filesystem path in the system file manager.
 *
 * TODO(tauri): invoke('open_path', { path }) using tauri-plugin-shell's
 * open. Opens the containing folder or the file itself, depending on
 * the OS default. No-op in the browser build.
 */
export async function openPath(_path: string): Promise<void> {
    // TODO(tauri): replace with real OS call.
}
