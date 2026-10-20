import type { Media } from '../types';
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


export async function mediaFromPath(path: string): Promise<Media> {
    const filename = path.split(/[\\/]/).pop() ?? path;
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    const isAudio = ['mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'wma', 'aiff', 'aif'].includes(ext);
    const url = await toMediaUrl(path);

    if (isAudio) {
        return {
            kind: 'audio',
            id: path,
            url,
            title: filename,
            artist: '',
            album: '',
            year: new Date().getFullYear(),
            dur: 0,
            meta: '',
        };
    }

    return {
        kind: 'video',
        id: path,
        url,
        title: filename,
        sub: '',
        dur: 0,
        codec: '',
    };
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
