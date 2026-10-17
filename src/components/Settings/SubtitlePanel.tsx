import { Group, Row } from './Shared';
import { Seg } from '../Segment';
import { Switch } from '../Switch';
import { usePlayer } from '../../hooks/player';
import type { SubtitleStyle } from '../../types/settings';
import { SubtitlePreview } from './subtitle/Subtitle';
import { COLOR_PRESETS } from './subtitle/shared';


export function SubtitlePanel() {
    const { settings, setSetting, isChanged, resetSetting } = usePlayer();
    const style = settings.subtitleStyle;
    const disabled = settings.useSystemCaptionStyle;

    const setStyle = <K extends keyof SubtitleStyle>(key: K, value: SubtitleStyle[K]) => {
        setSetting('subtitleStyle', { ...style, [key]: value });
    };

    return (
        <>
            <Group>Source</Group>
            <Row
                title="Use system caption style"
                changed={isChanged('useSystemCaptionStyle')}
                onReset={() => resetSetting('useSystemCaptionStyle')}
                desc="Follows your operating system's caption appearance. Turn this off to style subtitles in OpenReel."
                control={
                    <Switch
                        on={settings.useSystemCaptionStyle}
                        onChange={v => setSetting('useSystemCaptionStyle', v)}
                        label="Use system caption style"
                    />
                }
            />

            {/* Preview */}
            <div className="my-5">
                <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2">
                    Preview
                </div>
                <SubtitlePreview style={style} disabled={disabled} />
            </div>

            {/* Style controls — disabled when system style is used */}
            <div className={disabled ? 'opacity-50 pointer-events-none' : ''}>
                <Group>Appearance</Group>

                <Row
                    title="Font size"
                    changed={isChanged('subtitleStyle')}
                    onReset={() => setStyle('fontSize', 18)}
                    desc={`${style.fontSize} px`}
                    control={
                        <input
                            type="range"
                            min={12}
                            max={62}
                            step={1}
                            value={style.fontSize}
                            onChange={e => setStyle('fontSize', Number(e.target.value))}
                            className="w-[160px] accent-accent"
                            aria-label="Font size"
                        />
                    }
                />

                <Row
                    title="Font weight"
                    desc=""
                    control={
                        <Seg<'regular' | 'medium' | 'bold'>
                            value={style.fontWeight}
                            onChange={v => setStyle('fontWeight', v)}
                            options={[
                                { v: 'regular', l: 'Regular' },
                                { v: 'medium', l: 'Medium' },
                                { v: 'bold', l: 'Bold' },
                            ]}
                        />
                    }
                />

                <Row
                    title="Text color"
                    desc=""
                    control={
                        <div className="flex gap-1.5 items-center">
                            {(Object.keys(COLOR_PRESETS) as Array<SubtitleStyle['color']>).map(c => {
                                const preset = COLOR_PRESETS[c];
                                const active = style.color === c;
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setStyle('color', c)}
                                        aria-label={preset.label}
                                        aria-pressed={active}
                                        title={preset.label}
                                        className={`w-5 h-5 rounded-sm border-2 transition-all
                        ${active
                                                ? 'border-accent scale-110'
                                                : 'border-border-2 hover:border-border-3'}`}
                                        style={{ background: preset.hex }}
                                    />
                                );
                            })}
                        </div>
                    }
                />

                <Group>Legibility</Group>

                <Row
                    title="Outline"
                    desc="A thin edge around the text keeps subtitles readable over bright video."
                    control={
                        <Seg<'none' | 'thin' | 'medium' | 'thick'>
                            value={style.outline}
                            onChange={v => setStyle('outline', v)}
                            options={[
                                { v: 'none', l: 'None' },
                                { v: 'thin', l: 'Thin' },
                                { v: 'medium', l: 'Medium' },
                                { v: 'thick', l: 'Thick' },
                            ]}
                        />
                    }
                />

                <Row
                    title="Background"
                    desc="A box behind the text. Solid blocks the video; subtle lets it through."
                    control={
                        <Seg<'none' | 'subtle' | 'solid'>
                            value={style.background}
                            onChange={v => setStyle('background', v)}
                            options={[
                                { v: 'none', l: 'None' },
                                { v: 'subtle', l: 'Subtle' },
                                { v: 'solid', l: 'Solid' },
                            ]}
                        />
                    }
                />

                <Group>Position</Group>

                <Row
                    title="Distance from bottom"
                    changed={isChanged('subtitleStyle')}
                    onReset={() => setStyle('positionFromBottom', 8)}
                    desc={`${style.positionFromBottom}% of the video height`}
                    control={
                        <input
                            type="range"
                            min={0}
                            max={40}
                            step={1}
                            value={style.positionFromBottom}
                            onChange={e => setStyle('positionFromBottom', Number(e.target.value))}
                            className="w-[160px] accent-accent"
                            aria-label="Distance from bottom"
                        />
                    }
                />
            </div>

            {isChanged('subtitleStyle') && (
                <div className="mt-4 pt-4 border-t border-border">
                    <button
                        type="button"
                        onClick={() => resetSetting('subtitleStyle')}
                        className="text-[11.5px] text-text-3 hover:text-text transition-colors"
                    >
                        Reset all subtitle styling
                    </button>
                </div>
            )}
        </>
    );
}

