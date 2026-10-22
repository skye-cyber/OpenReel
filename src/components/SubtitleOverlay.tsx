import { useSubtitleCues } from '../hooks/useSubtitleCues';
import { findActiveCue } from '../lib/subtitles/vtt';
import { usePlayer } from '../hooks/player';
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

interface SubtitleOverlayProps {
    /** Current playback position in seconds. */
    currentTime: number;
    /**
     * URL of the WebVTT file to render. When null or undefined, no
     * subtitles are shown. The caller is responsible for resolving
     * this from the selected subtitle track.
     */
    src: string | null | undefined;
    /**
     * Pre-parsed cues. When provided, takes precedence over `src` and
     * skips the fetch. Used for legacy MKV demuxer output.
     */
    cues?: SubtitleCue[] | null;
}

export function SubtitleOverlay({ currentTime, src, cues: cuesProp }: SubtitleOverlayProps) {
    const { settings } = usePlayer();

    // Fetch VTT cues from the URL. If pre-parsed cues are provided,
    // skip the fetch entirely.
    const { activeText } = useSubtitleCues(
        cuesProp ? null : src ?? null,
        currentTime,
    );
    console.log(activeText)
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

    const shadow = outlinePx > 0
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
                {activeText}
            </span>
        </div>
    );
}
