import type { ParsedUrl, ParseError } from '../types/urldg';
import { SUPPORTED_SCHEMES, SCHEME_LABELS } from '../types/urldg';
import type { Media } from '../types';

/**
 *   **URL validation**\
 *   The core player supports **http**, **https***, **rtsp**, **rtmp**, **srt**, **file**.\
 *   Parsing is deliberately permissive — we accept anything that
 *   parses as a URL with one of these schemes, then let the engine
 *   reject it if it can't handle the specific stream.
 */
export function parseUrl(input: string): ParsedUrl | ParseError {
    const trimmed = input.trim();
    if (!trimmed) {
        return { ok: false, message: 'Enter a URL to open.' };
    }

    let url: URL;
    try {
        url = new URL(trimmed);
    } catch {
        return {
            ok: false,
            message: 'That doesn’t look like a URL. Include a scheme like https:// at the start.',
        };
    }

    if (!SUPPORTED_SCHEMES.includes(url.protocol)) {
        const name = url.protocol.replace(':', '');
        return {
            ok: false,
            message: `OpenReel can’t open ${name} addresses. Use ${SCHEME_LABELS.slice(0, 5).join(', ')}, or file.`,
        };
    }

    let title: string;
    if (url.protocol === 'file:') {
        const parts = url.pathname.split('/');
        title = decodeURIComponent(parts[parts.length - 1] || '') || url.pathname;
    } else {
        title = decodeURIComponent(url.pathname.split('/').pop() || '') || url.hostname || url.href;
    }

    const isAudio = /\.(flac|wav|mp3|m4a|ogg|opus)(\?|$)/i.test(url.pathname);
    const isStream = ['rtsp:', 'rtmp:', 'srt:'].includes(url.protocol);
    const id = trimmed;

    const media: Media = isAudio
        ? {
            kind: 'audio',
            id,
            title,
            artist: url.hostname || 'Stream',
            album: 'Stream',
            year: new Date().getFullYear(),
            dur: 0,
            meta: url.protocol.replace(':', '').toUpperCase(),
        }
        : {
            kind: 'video',
            id,
            title,
            sub: isStream ? 'Live stream' : (url.hostname || url.protocol.replace(':', '')),
            dur: 0,
            codec: url.protocol.replace(':', '').toUpperCase(),
        };

    return { ok: true, media };
}


const RECENT_KEY = 'openreel.remembered-urls';
const MAX_RECENTS = 5;

export function loadRecents(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(RECENT_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(x => typeof x === 'string').slice(0, MAX_RECENTS);
    } catch {
        return [];
    }
}

export function saveRecents(urls: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(urls.slice(0, MAX_RECENTS)));
    } catch {
        // Storage unavailable — not fatal.
    }
}

export function rememberUrl(url: string): void {
    const current = loadRecents();
    const next = [url, ...current.filter(u => u !== url)].slice(0, MAX_RECENTS);
    saveRecents(next);
}

export function forgetUrl(url: string): void {
    const next = loadRecents().filter(u => u !== url);
    saveRecents(next);
}

export function displayNameFor(url: string): string {
    try {
        const u = new URL(url);
        const tail = decodeURIComponent(u.pathname.split('/').pop() || '');
        if (tail) return tail;
        return u.hostname || url;
    } catch {
        return url;
    }
}
