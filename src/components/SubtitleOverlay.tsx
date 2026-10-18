import { usePlayer } from '../hooks/player';
import { useSubtitleCues } from '../hooks/useSubtitleCues';
import { findActiveCue } from '../lib/subtitles/vtt';
import type { SubtitleCue } from '../types/mkvSource';
import type { SubtitleStyle } from '../types/settings';

const COLOR_HEX: Record<SubtitleStyle['color'], string> = {
    white: '#ffffff',
    yellow: '#ffe94a',
    cyan: '#7ce4f4',
    green: '#8ce89a',
    magenta: '#f49ac8',
    red: '#f27c7c',
    black: '#0a0a0a',
};

/* Matches the SUB_TRACKS array in the transport menu. */
const TRACK_URLS: Record<number, string> = {
    0: '/public/media/sample.vtt',
    1: '/public/media/sample.vtt',
    2: '/public/media/sample.vtt',
};

interface SubtitleOverlayProps {
    /** Current playback position in seconds. */
    currentTime: number;
     /** Pre-parsed cues from the MKV demuxer. When null, use the VTT path. */
    cues?: SubtitleCue[]|null;
}

export function SubtitleOverlay({ currentTime, cues: cuesProp }: SubtitleOverlayProps) {
    const { subTrack, settings } = usePlayer();
    const url = subTrack >= 0 ? TRACK_URLS[subTrack] ?? null : null;
    const { activeText: vttText } = useSubtitleCues(cuesProp ? null : url, currentTime);
    const cue = cuesProp ? findActiveCue(cuesProp, currentTime) : null;
    const activeText = cue?.text ?? vttText;
    const style = settings.subtitleStyle;
    const disabled = settings.useSystemCaptionStyle;

    if (!activeText || disabled) return null;

    const outlinePx =
    style.outline === 'none' ? 0
    : style.outline === 'thin' ? 1.5
    : style.outline === 'medium' ? 2.5
    : 4;

    const background =
    style.background === 'none' ? 'transparent'
    : style.background === 'subtle' ? 'rgba(0, 0, 0, 0.45)'
    : 'rgba(0, 0, 0, 0.92)';

    const shadow =
    outlinePx > 0
    ? [
        `-${outlinePx}px 0 0 #000`,
        `${outlinePx}px 0 0 #000`,
        `0 -${outlinePx}px 0 #000`,
        `0 ${outlinePx}px 0 #000`,
        `-${outlinePx}px -${outlinePx}px 0 #000`,
        `${outlinePx}px -${outlinePx}px 0 #000`,
        `-${outlinePx}px ${outlinePx}px 0 #000`,
        `${outlinePx}px ${outlinePx}px 0 #000`,
    ].join(', ')
    : 'none';

    return (
        <div
        className="absolute left-0 right-0 z-[6] flex justify-center pointer-events-none px-6"
        style={{ bottom: `${style.positionFromBottom}%` }}
        aria-live="polite"
        aria-atomic="true"
        >
        <span
        style={{
            fontSize: `${style.fontSize}px`,
            fontWeight: style.fontWeight === 'bold' ? 700 : style.fontWeight === 'medium' ? 600 : 400,
            color: COLOR_HEX[style.color],
            textShadow: shadow,
            background,
            padding: background === 'transparent' ? 0 : '4px 12px',
            borderRadius: 4,
            lineHeight: 1.35,
            maxWidth: '90%',
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
        }}
        >
        {cue.text}
        </span>
        </div>
    );
}
