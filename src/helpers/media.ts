import type { Media } from "../types";
import type { MediaInfo } from "../types/player";

export const getMediaInfo = (m: Media): MediaInfo => {
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

export const LANG_NAMES: Record<string, string> = {
    eng: 'English', ger: 'German', deu: 'German', fre: 'French', fra: 'French',
    spa: 'Spanish', ita: 'Italian', jpn: 'Japanese', chi: 'Chinese', zho: 'Chinese',
    kor: 'Korean', rus: 'Russian', por: 'Portuguese', ara: 'Arabic', hin: 'Hindi',
};

export function displayLanguage(code: string | null): string | null {
    if (!code) return null;
    return LANG_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}
