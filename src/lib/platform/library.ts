/**
 * Library scanning — platform boundary.
 *
 * TODO(tauri): replace the simulated scan with a real recursive directory
 * walk (`invoke('scan_folder', { path })`) that returns the actual file
 * list. The simulation exists so the UI has something to react to.
 */

export interface Folder {
    id: string;
    path: string;
    label: string;
    /** Simulated file count for the demo. Real value comes from the walk. */
    itemCount: number;
}

export interface ScanProgress {
    /** Zero-based index of the folder being scanned. */
    folderIndex: number;
    /** Total folders being scanned. */
    folderCount: number;
    /** Items discovered so far across all folders. */
    itemsFound: number;
    /** Total items expected across all folders. */
    itemsExpected: number;
    /** The folder currently being walked. */
    currentFolder: string;
}

export interface ScanResult {
    folders: Folder[];
    itemsFound: number;
    cancelled: boolean;
}

export const DEFAULT_FOLDERS: Folder[] = [
    { id: 'f-videos', label: 'Videos', path: '~/Videos', itemCount: 3240 },
    { id: 'f-course', label: 'Course', path: '~/Videos/Course', itemCount: 4182 },
    { id: 'f-music', label: 'Music', path: '~/Music', itemCount: 990 },
];

/**
 * Simulate scanning one folder. Yields ~20 progress updates per folder,
 * each after a short delay proportional to the folder's size.
 */
async function simulateFolder(
    folder: Folder,
    startCount: number,
    folderIndex: number,
    folderCount: number,
    totalExpected: number,
    onProgress: (p: ScanProgress) => void,
    isCancelled: () => boolean,
): Promise<ScanResult> {
    const STEPS = 20;
    const stepItems = Math.floor(folder.itemCount / STEPS);
    const stepMs = 120;
    let found = 0;

    for (let i = 1; i <= STEPS; i++) {
        if (isCancelled()) return { folders: [], itemsFound: 0, cancelled: true };
        await new Promise(r => setTimeout(r, stepMs));
        found = i === STEPS ? folder.itemCount : stepItems * i;
        onProgress({
            folderIndex,
            folderCount,
            itemsFound: startCount + found,
            itemsExpected: totalExpected,
            currentFolder: folder.label,
        });
    }

    return { folders: [folder], itemsFound: folder.itemCount, cancelled: false };
}

export async function scanAll(
    folders: Folder[],
    onProgress: (p: ScanProgress) => void,
    isCancelled: () => boolean = () => false,
): Promise<ScanResult> {
    const totalExpected = folders.reduce((n, f) => n + f.itemCount, 0);
    let total = 0;

    for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        if (!folder) continue;
        const { itemsFound, cancelled } = await simulateFolder(
            folder, total, i, folders.length, totalExpected, onProgress, isCancelled,
        );
        total += itemsFound;
        if (cancelled) {
            return { folders, itemsFound: total, cancelled: true };
        }
    }

    return { folders, itemsFound: total, cancelled: false };
}

export async function scanOne(
    folder: Folder,
    onProgress: (p: ScanProgress) => void,
    isCancelled: () => boolean = () => false,
): Promise<ScanResult> {
    return simulateFolder(folder, 0, 0, 1, folder.itemCount, onProgress, isCancelled);
}

/**
 * Watch a folder for changes. Returns an unsubscribe function.
 *
 * TODO(tauri): replace with a real filesystem watcher (tauri-plugin-fs-watch
 * or inotify via a Rust command). The callback fires when files are added,
 * moved, removed, or renamed within the folder. Currently a no-op that
 * never fires; the app treats this as "watching unavailable on this build."
 */
export function watchFolder(
    _folder: Folder,
    _onChange: () => void,
): () => void {
    return () => { /* no-op */ };
}

/**
 * Whether folder watching is available on this platform/build.
 * False until the backend is connected.
 */
export function isWatchAvailable(): boolean {
    return false;
}
