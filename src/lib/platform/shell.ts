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
