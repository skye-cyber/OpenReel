import { invoke, Channel } from '@tauri-apps/api/core';
import { isTauri } from './system/shared';
import type {
    LibraryFile,
    LibraryMeta,
    ScanResultSingle,
} from '../../types/library';
import type { Folder, ScanProgress } from '../../types';
import type { MediaProbe } from '../../types/media';

/**
 * Default folders for first launch. Empty until the user adds one
 * via the picker — no hardcoded `~` paths because they can't be
 * resolved by the filesystem walk without expansion.
 */
export const DEFAULT_FOLDERS: Folder[] = [];


class LibraryImpl {
    /**
     * Scan a single folder. Returns the file count and a scan id that can
     * be used to paginate the cached file list via `getLibraryPage`.
     */
    async scanFolder(
        folder: Folder,
        onProgress: (p: ScanProgress) => void,
    ): Promise<{ itemsFound: number; scanId: string }> {
        const channel = new Channel<{
            itemsFound: number;
            itemsExpected: number;
            currentFolder: string;
        }>();

        channel.onmessage = (msg) => {
            onProgress({
                itemsFound: msg.itemsFound,
                itemsExpected: msg.itemsExpected,
                currentFolder: msg.currentFolder,
            });
        };

        const [result, scanId] = await invoke<[ScanResultSingle, string]>('scan_folder', {
            path: folder.path,
            folderId: folder.id,
            onProgress: channel,
        });

        return { itemsFound: result.itemsFound, scanId };
    }

    /**
     * Fetch a page of files from the in-memory index.
     * Works whether the index was loaded from disk on startup or
     * produced by a recent scan.
     */
    async getLibraryPage(
        offset: number,
        limit: number,
    ): Promise<LibraryFile[]> {
        if (!isTauri) return [];
        return invoke<LibraryFile[]>('get_library_page', { offset, limit });
    }

    /**
     * Metadata about the current index without transferring files.
     */
    async getLibraryMeta(): Promise<LibraryMeta> {
        if (!isTauri) {
            return {
                hasIndex: false,
                totalCount: 0,
                folderCounts: {},
                scannedAt: 0,
                scanId: null,
            };
        }
        return invoke<LibraryMeta>('get_library_meta');
    }

    /**
     * Probe a media file for duration and codec info via ffprobe.
     * Returns a zero-valued probe if ffprobe isn't installed.
     */
    async probeMediaFile(path: string): Promise<MediaProbe> {
        return invoke<MediaProbe>('probe_media_file', { path });
    }

    // Browser: simulated scan
    async scanFolderSimulated(
        folder: Folder,
        onProgress: (p: ScanProgress) => void,
    ): Promise<{ itemsFound: number; scanId: string }> {
        const STEPS = 20;
        const stepItems = Math.floor(folder.itemCount / STEPS);
        const stepMs = 120;

        for (let i = 1; i <= STEPS; i++) {
            await new Promise(r => setTimeout(r, stepMs));
            const found = i === STEPS ? folder.itemCount : stepItems * i;
            onProgress({
                itemsFound: found,
                itemsExpected: folder.itemCount,
                currentFolder: folder.label,
            });
        }

        return { itemsFound: folder.itemCount, scanId: `simulated-${folder.id}` };
    }

    // Watch folders
    async watchFolder(
        folder: Folder,
        onChange: () => void,
    ): Promise<() => void> {
        if (!isTauri) return () => { };

        const { listen } = await import('@tauri-apps/api/event');
        const id = await invoke<string>('watch_folder', { path: folder.path });
        const unlisten = await listen(`folder-changed:${id}`, onChange);
        return () => {
            void unlisten();
            void invoke('unwatch_folder', { id });
        };
    }

    isWatchAvailable(): boolean {
        return isTauri;
    }
}

export const librarymanager = new LibraryImpl()
