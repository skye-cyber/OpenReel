import type { LibraryRow, Media, OpenFileRow, QueueItem, RecentItem } from '../types';
import { AUDIO, VIDEO } from '../data/mock';
import { toMediaUrl } from '../lib/mediaPath';
// import { toMediaUrl } from '../lib/mediaPath';

export function parseDur(d: string): number {
    if (!d || d === '—') return 0;
    const parts = d.split(':').map(Number);
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
    return 0;
}

export async function mediaFromLibraryRow(row: LibraryRow): Promise<Media> {
    const id = row.p;
    const dur = parseDur(row.d);
    const isAudio = /\.(flac|wav|mp3|m4a|ogg|opus)$/i.test(row.p);
    const url = await toMediaUrl(row.p);
    return isAudio
        ? { ...AUDIO, id, url, title: row.t, dur }
        : { ...VIDEO, id, url, title: row.t, dur };
}

export async function mediaFromOpenFile(row: OpenFileRow): Promise<Media> {
    const dur = parseDur(row.d);
    const isAudio = row.k === 'audio';
    const id = row.n;
    const url = await toMediaUrl(row.n);
    return isAudio
        ? { ...AUDIO, id, url, title: row.n, dur }
        : { ...VIDEO, id, url, title: row.n, dur };
}

export async function mediaFromRecentItem(row: RecentItem): Promise<Media> {
    const id = row.p //+ '/' + row.n;
    const dur = parseDur(row.d);
    const url = await toMediaUrl(id);
    return row.k === 'audio'
        ? { ...AUDIO, id, url, title: row.n, dur }
        : { ...VIDEO, id, url, title: row.n, dur };
}

export async function mediaFromQueueItem(item: QueueItem): Promise<Media> {
    const id = item.n;
    const dur = parseDur(item.d);
    const isAudio = /\.(flac|wav|mp3|m4a|ogg|opus)$/i.test(item.n);
    const url = await toMediaUrl(item.n);
    return isAudio
        ? { ...AUDIO, id, url, title: item.n, dur }
        : { ...VIDEO, id, url, title: item.n, dur };
}


export async function mediaFromPath(path: string): Promise<Media> {
    const filename = path.split(/[\\/]/).pop() ?? path;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const isAudio = ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'wma', 'aiff', 'aif'].includes(ext);

    const id = path;
    const url = await toMediaUrl(path);
    const title = filename;
    const dur = 0;

    return isAudio
        ? { ...AUDIO, id, url, title, dur }
        : { ...VIDEO, id, url, title, dur };
}


export function formatRelative(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) {
        const m = Math.floor(seconds / 60);
        return `${m} minute${m === 1 ? '' : 's'} ago`;
    }
    if (seconds < 86400) {
        const h = Math.floor(seconds / 3600);
        return `${h} hour${h === 1 ? '' : 's'} ago`;
    }
    const d = Math.floor(seconds / 86400);
    return `${d} day${d === 1 ? '' : 's'} ago`;
}
