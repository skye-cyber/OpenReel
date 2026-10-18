import type { SubtitleTrackInfo } from '../../types/mkvSource';
import stripSubtitleMarkup from './markup';

/* ============================================================
 *  Subtitle assembly
 *  libav-wasm returns a flat array mixing { type: 'header' } track
 *  metadata with { type: 'dialogue' } cues. Group them per stream.
 *  ============================================================ */
export default function assembleSubtitleTracks(
    raw: Array<
        | { type: 'header'; streamIndex: number; content: string; format: string[]; language: string; title: string }
        | { type: 'dialogue'; streamIndex: number; start: number; end: number; content: string }
    >,
): SubtitleTrackInfo[] {
    const byStream = new Map<number, SubtitleTrackInfo>();

    for (const item of raw) {
        if (item.type === 'header') {
            byStream.set(item.streamIndex, {
                streamIndex: item.streamIndex,
                language: item.language || null,
                title: item.title || null,
                format: item.format ?? [],
                cues: [],
            });
        }
    }

    for (const item of raw) {
        if (item.type === 'dialogue') {
            const track = byStream.get(item.streamIndex);
            if (!track) continue;
            const text = stripSubtitleMarkup(item.content);
            if (!text) continue;
            track.cues.push({ start: item.start, end: item.end, text });
        }
    }

    for (const track of byStream.values()) {
        track.cues.sort((a, b) => a.start - b.start);
    }

    return Array.from(byStream.values());
}
