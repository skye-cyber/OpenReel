import type { Media } from "../types";
import type { MediaInfo } from "../types/player";

const _getMediaInfo = (m: Media): MediaInfo => {
    if (m.kind === 'error') {
        return {
            container: m.codec || '—',
            duration: 0,
            streams: [],
        };
    }

    if (m.kind === 'audio') {
        return {
            container: m.meta.split(' · ')[0] ?? 'Audio',
            duration: m.dur,
            overallBitrate: m.meta.split(' · ').find(p => p.includes('kbps')),
            fileSize: '—',
            streams: [
                {
                    kind: 'audio',
                    index: 0,
                    codec: m.meta.split(' · ')[0] ?? 'FLAC',
                    spec: m.meta.split(' · ')[2] ?? '2 ch',
                    rate: m.meta.split(' · ')[1] ?? '—',
                    bitrate: m.meta.split(' · ').find(p => p.includes('kbps')) ?? '—',
                    language: 'English',
                    default: true,
                },
            ],
        };
    }

    // Video — mock but plausible.
    return {
        container: m.codec.split(' · ')[0] ?? 'MKV',
        duration: m.dur,
        overallBitrate: '8 425 kbps',
        fileSize: '1.24 GB',
        streams: [
            {
                kind: 'video',
                index: 0,
                codec: 'H.264 (High@L4.1)',
                spec: '1920×1080',
                rate: '23.976 fps',
                bitrate: '7 218 kbps',
                extra: [
                    { label: 'Color space', value: 'YUV 4:2:0 · 8-bit · BT.709' },
                    { label: 'Hardware decode', value: 'VA-API (H.264)' },
                    { label: 'Aspect ratio', value: '16:9 (1.778)' },
                    { label: 'Scan type', value: 'Progressive' },
                ],
            },
            {
                kind: 'audio',
                index: 1,
                codec: 'AC-3',
                spec: '5.1 (3/2/1)',
                rate: '48 kHz',
                bitrate: '640 kbps',
                language: 'English',
                title: 'Main',
                default: true,
            },
            {
                kind: 'audio',
                index: 2,
                codec: 'AC-3',
                spec: '5.1 (3/2/1)',
                rate: '48 kHz',
                bitrate: '640 kbps',
                language: 'German',
            },
            {
                kind: 'subtitle',
                index: 3,
                codec: 'SubRip (SRT)',
                spec: 'UTF-8',
                language: 'English',
                default: true,
            },
            {
                kind: 'subtitle',
                index: 4,
                codec: 'SubRip (SRT)',
                spec: 'UTF-8',
                language: 'English',
                title: 'Forced',
                forced: true,
            },
        ],
    };
};


export function formatTrackLabel(language: string | null, title: string | null, fallback: string): string {
    if (language && title) return `${language} · ${title}`;
    if (language) return language.toUpperCase();
    if (title) return title;
    return fallback;
}

export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export const LANG_NAMES: Record<string, string> = {
    eng: 'English', ger: 'German', deu: 'German', fre: 'French', fra: 'French',
    spa: 'Spanish', ita: 'Italian', jpn: 'Japanese', chi: 'Chinese', zho: 'Chinese',
    kor: 'Korean', rus: 'Russian', por: 'Portuguese', ara: 'Arabic', hin: 'Hindi',
};

export function displayLanguage(code: string | null): string | null {
    if (!code) return null;
    return LANG_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}


export function computeNextIndex(
    length: number,
    current: number,
    shuffle: boolean,
    repeat: 'off' | 'all' | 'one',
    shuffled: number[] | null,
): number | null {
    if (length === 0) return null;

    if (shuffle && shuffled) {
        const posInShuffle = shuffled.indexOf(current);
        const nextPos = posInShuffle + 1;
        if (nextPos < shuffled.length) return shuffled[nextPos]!;
        if (repeat === 'all') {
            // Reshuffle and start over.
            return shuffled[0]!;
        }
        return null;
    }

    const next = current + 1;
    if (next < length) return next;
    if (repeat === 'all') return 0;
    return null;
}

export function computePrevIndex(
    length: number,
    current: number,
    shuffle: boolean,
    repeat: 'off' | 'all' | 'one',
    shuffled: number[] | null,
): number | null {
    if (length === 0) return null;

    if (shuffle && shuffled) {
        const posInShuffle = shuffled.indexOf(current);
        const prevPos = posInShuffle - 1;
        if (prevPos >= 0) return shuffled[prevPos]!;
        return repeat === 'all' ? shuffled[shuffled.length - 1]! : null;
    }

    const prev = current - 1;
    if (prev >= 0) return prev;
    return repeat === 'all' ? length - 1 : null;
}

/**
 * Format a bitrate in bits per second as a human-readable string.
 *
 * 0 or negative returns "—" (ffprobe reports 0 when the codec doesn't
 * expose a bitrate, e.g. some VBR audio streams and MKV containers
 * without per-stream bitrate metadata).
 */
export function formatBitrate(bps: number): string {
    if (!Number.isFinite(bps) || bps <= 0) return '—';
    if (bps < 1_000) return `${Math.round(bps)} bps`;
    if (bps < 1_000_000) return `${(bps / 1_000).toFixed(0)} kbps`;
    if (bps < 1_000_000_000) {
        const mbps = bps / 1_000_000;
        return mbps < 10 ? `${mbps.toFixed(2)} Mbps` : `${mbps.toFixed(1)} Mbps`;
    }
    return `${(bps / 1_000_000_000).toFixed(2)} Gbps`;
}

/**
 * Format a frame rate (frames per second) as a string.
 *
 * Rounds to three decimals so 23.976 stays distinct from 24 and
 * 29.970 stays distinct from 30. Whole numbers get no decimals.
 * ffprobe reports 0 when the stream has no frame rate (audio-only,
 * still images), which maps to "—".
 */
export function formatFrameRate(fps: number): string {
    if (!Number.isFinite(fps) || fps <= 0) return '—';
    // Whole numbers: 24, 30, 60.
    if (Math.abs(fps - Math.round(fps)) < 0.0005) {
        return `${Math.round(fps)} fps`;
    }
    // Standard broadcast rates: keep three decimals.
    return `${fps.toFixed(3)} fps`;
}

export function needsTranscode(m: Media): boolean {
    if (m.kind === 'error') return false;
    const ext = m.id.split('.').pop()?.toLowerCase() ?? '';
    // MKV is not playable in WebKitGTK regardless of codec. Transcode.
    if (ext === 'mkv') return true;
    // Other HEVC-in-MP4 sources might play on Windows but fail on Linux.
    // The extension alone can't tell; the probe does, but probing adds
    // latency. For files with a `.mkv` extension we always transcode.
    // For `.mp4`/`.webm`/etc., play as-is and let the error stage handle
    // codec failures.
    return false;
}
