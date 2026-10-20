/**
 * Library scanning — platform boundary.
 *
 * TODO(tauri): replace the simulated scan with a real recursive directory
 * walk (`invoke('scan_folder', { path })`) that returns the actual file
 * list. The simulation exists so the UI has something to react to.
 */

import { isTauri } from './system/shared';

export interface Folder {
    id: string;
    path: string;
    label: string;
    /** Simulated file count for the demo. Real value comes from the walk. */
    itemCount: number;
}

export interface ScanProgress {
    /** Zero-based index of the folder being scanned. */
    folderIndex?: number;
    /** Total folders being scanned. */
    folderCount?: number;
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
    { id: 'videos', label: 'Videos', path: '~/Videos', itemCount: 3240 },
    { id: 'music', label: 'Music', path: '~/Music', itemCount: 990 },
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
): Promise<ScanResult | { items: number; cancelled: boolean }> {
    if (isTauri) {
        const { invoke, Channel } = await import('@tauri-apps/api/core');
        const channel = new Channel<{ items_found: number; items_expected: number }>();
        channel.onmessage = (msg) => {
            onProgress({
                folderIndex: 0,
                folderCount: 1,
                itemsFound: msg.items_found,
                itemsExpected: msg.items_expected,
                currentFolder: folder.label,
            });
        };
        const result = await invoke<{ items_found: number; cancelled: boolean }>('scan_folder', {
            path: folder.path,
            onProgress: channel,
        });
        return { items: result.items_found, cancelled: result.cancelled };
    }
    return simulateFolder(folder, 0, 0, 1, folder.itemCount, onProgress, isCancelled);
}

export async function watchFolder(
    folder: Folder,
    onChange: () => void,
): Promise<() => void> {
    if (isTauri) {
        const { listen } = await import('@tauri-apps/api/event')
        const { invoke } = await import('@tauri-apps/api/core');
        const id = await invoke<string>('watch_folder', { path: folder.path });
        const unlisten = await listen(`folder-changed:${id}`, onChange);
        return () => {
            void unlisten();
            void invoke('unwatch_folder', { id });
        };
    }
    return () => { };
}

/**
 * Whether folder watching is available on this platform/build.
 * False until the backend is connected.
 */
export function isWatchAvailable(): boolean {
    return isTauri;
}
