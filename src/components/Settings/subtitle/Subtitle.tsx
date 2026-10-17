import { DEFAULT_PREVIEW_STYLE, COLOR_PRESETS } from "./shared";
import type { SubtitleStyle } from "../../../types/settings";

export function SubtitlePreview({ style, disabled }: { style: SubtitleStyle; disabled: boolean }) {
    const activeStyle = disabled
        ? { ...DEFAULT_PREVIEW_STYLE }   // what the system would render
        : style;

    const outlinePx =
        activeStyle.outline === 'none' ? 0
            : activeStyle.outline === 'thin' ? 1
                : activeStyle.outline === 'medium' ? 2
                    : 3;

    const bg =
        activeStyle.background === 'none' ? 'transparent'
            : activeStyle.background === 'subtle' ? 'rgba(0,0,0,.45)'
                : 'rgba(0,0,0,.92)';

    const textShadow = outlinePx > 0
        ? [
            `-${outlinePx}px 0 0 #000`, `1px 0 0 #000`,
            `0 -${outlinePx}px 0 #000`, `0 ${outlinePx}px 0 #000`,
            `-${outlinePx}px -${outlinePx}px 0 #000`, `${outlinePx}px -${outlinePx}px 0 #000`,
            `-${outlinePx}px ${outlinePx}px 0 #000`, `${outlinePx}px ${outlinePx}px 0 #000`,
        ].join(', ')
        : 'none';

    return (
        <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border
        bg-[#050608]">
            {/* Simulated video frame */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2230] via-[#0d1118] to-[#0a0d12]" />

            {/* Subtitle line */}
            <div
                className="absolute left-0 right-0 flex justify-center px-6"
                style={{ bottom: `${activeStyle.positionFromBottom}%` }}
            >
                <span
                    style={{
                        fontSize: `${activeStyle.fontSize * 0.55}px`,
                        fontWeight: activeStyle.fontWeight === 'bold' ? 700 : activeStyle.fontWeight === 'medium' ? 600 : 400,
                        color: COLOR_PRESETS[activeStyle.color].hex,
                        textShadow,
                        background: bg,
                        padding: bg === 'transparent' ? 0 : '2px 8px',
                        borderRadius: 3,
                        lineHeight: 1.3,
                        maxWidth: '90%',
                        textAlign: 'center',
                    }}
                >
                    The quick brown fox jumps over the lazy dog.
                </span>
            </div>

            {/* Disabled indicator */}
            {disabled && (
                <div className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider
            px-1.5 py-0.5 rounded-sm bg-[rgba(0,0,0,.6)] text-white/60">
                    System default
                </div>
            )}
        </div>
    );
}
