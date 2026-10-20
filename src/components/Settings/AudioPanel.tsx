import { useEffect, useState } from 'react';
import { PlatformTools } from '../../lib/platform/system/tools';
import { Row } from './Shared';
import { Button } from '../Button';
import { isTauri } from '../../lib/platform/system/shared';
import Icon from '../../lib/Icons';
import type { AudioDevice } from '../../types';

export function AudioPanel() {
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        if (!isTauri) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setTimeout(async () => {
            try {
                const [list, current] = await Promise.all([
                    PlatformTools.listAudioDevices(),
                    PlatformTools.getAudioDevice(),
                ]);
                setDevices(list);
                setSelected(current);
            } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        }, 1000)
    };

    useEffect(() => {
        void load();
    }, []);

    const handleChange = async (value: string) => {
        const next = value || null;
        setSelected(next);
        try {
            if (next) {
                await PlatformTools.setAudioDevice(next);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    // If the persisted selection is no longer present (device unplugged),
    // fall back to "System default" in the display.
    const effectiveValue =
        selected && devices.some(d => d.id === selected) ? selected : '';

    const desc = error
        ? `Couldn't read audio devices: ${error}`
        : loading
            ? 'Reading audio devices…'
            : devices.length === 0
                ? isTauri
                    ? 'No audio output devices found.'
                    : 'Audio device selection is only available in the desktop build.'
                : effectiveValue
                    ? `Playing to ${effectiveValue}`
                    : 'Using the system default output.';

    return (
        <>
            <Row
                title="Output device"
                desc={desc}
                control={
                    <div className="flex items-center gap-2">
                        <Select
                            value={effectiveValue}
                            onChange={handleChange}
                            disabled={!isTauri || loading || devices.length === 0}
                        >
                            <option value="">System default</option>
                            {devices.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name}{d.isDefault ? ' (default)' : ''}
                                </option>
                            ))}
                        </Select>
                        <Button
                            size="sm"
                            icon="refresh"
                            title="Refresh device list"
                            disabled={!isTauri || loading}
                            onClick={() => void load()}
                        >
                            {loading ? 'Loading…' : 'Refresh'}
                        </Button>
                    </div>
                }
            />
            {!isTauri && (
                <div className="mt-3 flex items-start gap-2 text-[11.5px] text-text-3 leading-relaxed">
                    <Icon name="info" size={13} className="mt-0.5 shrink-0" />
                    <span>
                        Device enumeration requires the desktop build. The browser
                        plays through whatever device the OS has set as default.
                    </span>
                </div>
            )}
        </>
    );
}

function Select({
    value, onChange, disabled, children,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className={`relative inline-flex items-center
            ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
        >
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                className="appearance-none h-[30px] pl-3 pr-8 rounded-md
            bg-surface-2 border border-border-2 text-text text-[12.5px]
            transition-colors cursor-pointer
            hover:bg-hover hover:border-border-3
            focus:outline-none focus-visible:outline-2 focus-visible:outline-accent
            focus-visible:outline-offset-1
            disabled:cursor-default
            min-w-[200px]"
            >
                {children}
            </select>
            <Icon
                name="chevDown"
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2
            text-text-3 pointer-events-none"
            />
        </div>
    );
}
