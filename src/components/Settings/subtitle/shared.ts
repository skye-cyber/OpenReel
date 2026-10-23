import type { SubtitleStyle } from "../../../types/settings";

export const COLOR_PRESETS: Record<SubtitleStyle['color'], { label: string; hex: string }> = {
    white: { label: 'White', hex: '#ffffff' },
    yellow: { label: 'Yellow', hex: '#ffe94a' },
    cyan: { label: 'Cyan', hex: '#7ce4f4' },
    green: { label: 'Green', hex: '#8ce89a' },
    magenta: { label: 'Magenta', hex: '#f49ac8' },
    red: { label: 'Red', hex: '#f27c7c' },
    black: { label: 'Black', hex: '#0a0a0a' },
};

export const DEFAULT_PREVIEW_STYLE: SubtitleStyle = {
    fontFamily: 'system',
    fontSize: 18,
    fontWeight: 'medium',
    color: 'white',
    outline: 'medium',
    background: 'subtle',
    positionFromBottom: 8,
};

