import { DEFAULT_PREVIEW_STYLE, COLOR_PRESETS } from "./shared";
import type { SubtitleStyle } from "../../../types/settings";


export function SubtitlePreview({ style, disabled }: { style: SubtitleStyle; disabled: boolean }) {
    const activeStyle = disabled ? { ...DEFAULT_PREVIEW_STYLE } : style;

    // Match SubtitleOverlay exactly.
    const outlinePx =
        activeStyle.outline === 'none' ? 0
            : activeStyle.outline === 'thin' ? 1.5
                : activeStyle.outline === 'medium' ? 2.5
                    : 4;

    const bg =
        activeStyle.background === 'none' ? 'transparent'
            : activeStyle.background === 'subtle' ? 'rgba(0, 0, 0, 0.45)'
                : 'rgba(0, 0, 0, 0.92)';

    const textShadow = outlinePx > 0
        ? [
            `-${outlinePx}px 0 0 #000`, `${outlinePx}px 0 0 #000`,
            `0 -${outlinePx}px 0 #000`, `0 ${outlinePx}px 0 #000`,
            `-${outlinePx}px -${outlinePx}px 0 #000`, `${outlinePx}px -${outlinePx}px 0 #000`,
            `-${outlinePx}px ${outlinePx}px 0 #000`, `${outlinePx}px ${outlinePx}px 0 #000`,
        ].join(', ')
        : 'none';

    return (
        <div className="relative w-full aspect-video rounded-md overflow-hidden border border-border
        bg-[#050608]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a2230] via-[#0d1118] to-[#0a0d12]" />

            <div
                className="absolute left-0 right-0 flex justify-center px-6"
                style={{ bottom: `${activeStyle.positionFromBottom}%` }}
            >
                <span
                    style={{
                        // Same as SubtitleOverlay: real size, not scaled.
                        fontSize: `${activeStyle.fontSize}px`,
                        fontWeight: activeStyle.fontWeight === 'bold' ? 700 : activeStyle.fontWeight === 'medium' ? 600 : 400,
                        color: COLOR_PRESETS[activeStyle.color].hex,
                        textShadow,
                        background: bg,
                        padding: bg === 'transparent' ? 0 : '4px 12px',
                        borderRadius: 4,
                        lineHeight: 1.35,
                        maxWidth: '90%',
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    The quick brown fox jumps over the lazy dog.
                </span>
            </div>

            {disabled && (
                <div className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider
            px-1.5 py-0.5 rounded-sm bg-[rgba(0,0,0,.6)] text-white/60">
                    System default
                </div>
            )}
        </div>
    );
}
