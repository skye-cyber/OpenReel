import type { Filter, LibraryFile, Row } from "../types/library";

export const FILTERS: ReadonlyArray<{ id: Filter; l: string }> = [
    { id: 'all', l: 'All' },
    { id: 'video', l: 'Video' },
    { id: 'audio', l: 'Audio' },
    { id: 'unwatched', l: 'Unwatched' },
    { id: 'missing', l: 'Missing' },
];

export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}


export function rowFromFile(f: LibraryFile): Row {
    const isAudio = /^(mp3|flac|wav|m4a|aac|ogg|opus|wma)$/i.test(f.extension);
    return {
        id: f.path,
        title: f.name,
        path: f.path,
        duration: '—',
        format: isAudio ? 'Audio' : 'Video',
            size: formatSize(f.size),
            plays: 0,
            missing: false,
    };
}
