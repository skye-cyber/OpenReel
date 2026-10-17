/**
 * Filesystem operations — platform boundary.
 *
 * TODO(tauri): replace simulated folder picker with a real dialog
 * (`invoke('pick_folder')` backed by tauri-plugin-dialog). The boundary
 * returns null on cancel and a filesystem path string on success.
 */

/**
 * Present a folder picker to the user and return the selected path.
 * Returns null if the user cancels.
 *
 * The simulation cycles through a small list of plausible paths so the
 * flow can be exercised without a real dialog. The next value returned
 * depends on how many times this has been called in the session.
 */
let pickCount = 0;
const SIMULATED_FOLDERS = [
    '~/Videos/Course',
'~/Videos/Recordings',
'~/Music/Library',
'~/Downloads/Media',
'~/Documents/Archives',
];

export async function pickFolder(): Promise<string | null> {
    // Simulate dialog delay.
    await new Promise(r => setTimeout(r, 400));

    // Occasionally simulate cancel.
    if (Math.random() < 0.1) return null;

    const path = SIMULATED_FOLDERS[pickCount % SIMULATED_FOLDERS.length]!;
    pickCount++;
    return path;
}

/**
 * Derive a display label from a folder path.
 */
export function labelForFolderPath(path: string): string {
    const trimmed = path.replace(/\/+$/, '');
    const parts = trimmed.split('/');
    const last = parts[parts.length - 1];
    if (!last || last === '~') return path;
    return last;
}

/**
 * Derive a stable id from a folder path. Two folders with the same path
 * should have the same id so re-adding is a no-op.
 */
export function idForFolderPath(path: string): string {
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = ((hash << 5) - hash + path.charCodeAt(i)) | 0;
    }
    return 'f' + Math.abs(hash).toString(36);
}
