export interface Row {
    id: string;
    title: string;
    path: string;
    /** Display duration string — "—" until probed. */
    duration: string;
    /** Display format — "MKV", "MP3", "Video", "Audio". */
    format: string;
    /** Display size — "1.24 GB" or "—". */
    size: string;
    plays: number;
    missing: boolean;
}

export type Filter = 'all' | 'video' | 'audio' | 'unwatched' | 'missing';

export interface LibraryFile {
    name: string
    path: string
    folder_id: string
    size: number
    extension: string
};

export interface LibraryMeta {
    hasIndex: boolean;
    totalCount: number;
    folderCounts: Record<string, number>;
    scannedAt: number;
    scanId: string | null;
}

export interface ScanResultSingle {
    /** Number of media files found in this folder. */
    itemsFound: number;
    /** True if the scan was stopped by cancellation before completing. */
    cancelled: boolean;
}

export interface ScanResult {
    itemsFound: number,
    cancelled: boolean,
}
