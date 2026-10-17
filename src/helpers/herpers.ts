import type { LibraryRow, Media, OpenFileRow, QueueItem, RecentItem } from '../types';
import { AUDIO, VIDEO } from '../data/mock';

export function parseDur(d: string): number {
  if (!d || d === '—') return 0;
  const parts = d.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
  return 0;
}

export function mediaFromLibraryRow(row: LibraryRow): Media {
  const id = row.p;
  const dur = parseDur(row.d);
  const isAudio = /\.(flac|wav|mp3|m4a|ogg|opus)$/i.test(row.p);
  return isAudio
    ? { ...AUDIO, id, title: row.t, dur }
    : { ...VIDEO, id, title: row.t, dur };
}

export function mediaFromOpenFile(row: OpenFileRow): Media {
  const id = row.n;
  const dur = parseDur(row.d);
  const isAudio = row.k === 'audio';
  return isAudio
    ? { ...AUDIO, id, title: row.n, dur }
    : { ...VIDEO, id, title: row.n, dur };
}

export function mediaFromRecentItem(row: RecentItem): Media {
  const id = row.p + '/' + row.n;
  const dur = parseDur(row.d);
  return row.k === 'audio'
    ? { ...AUDIO, id, title: row.n, dur }
    : { ...VIDEO, id, title: row.n, dur };
}

export function mediaFromQueueItem(item: QueueItem): Media {
  const id = item.n;
  const dur = parseDur(item.d);
  const isAudio = /\.(flac|wav|mp3|m4a|ogg|opus)$/i.test(item.n);
  return isAudio
    ? { ...AUDIO, id, title: item.n, dur }
    : { ...VIDEO, id, title: item.n, dur };
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
