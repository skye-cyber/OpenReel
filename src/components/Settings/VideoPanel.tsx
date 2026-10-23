import { Group, Row } from './Shared';
import { Seg } from '../Segment';
import { Button } from '../Button';
import { usePlayer } from "../../hooks/player";
import type { Deint, Hw, Snap } from '../../types/settings';
import type { Probe } from '../../views/Welcome';
import { PlatformTools } from '../../lib/platform/system/tools';
import { useCallback, useEffect, useState } from 'react';
import type { HardwareProbe } from '../../types/platform';

export function VideoPanel() {
    const { settings, setSetting, isChanged, resetSetting } = usePlayer();
    const [probe, setProbe] = useState<Probe>(null);
    const [probeResult, setProbeResult] = useState<HardwareProbe | null>(null);

    const probeHardwareDecoding = useCallback(async () => {
        try {
            setProbe('run');
            const result = await PlatformTools.probeHardwareDecoding();
            setProbeResult(result)
            setProbe(result.available ? 'ok' : 'no' as Probe);
        } catch {
            setProbe('no' as Probe);
        }
    }, [])
    useEffect(() => {
        if (probeResult && probe) return
        probeHardwareDecoding()
    }, [])
    return (
        <>
            <Group>Decoding</Group>
            <Row
                title="Hardware decoding"
                changed={isChanged('hardwareDecoding')}
                onReset={() => resetSetting('hardwareDecoding')}
                desc="Use the GPU to decode video. Falls back automatically when unavailable."
                control={
                    <Seg<Hw>
                        value={settings.hardwareDecoding}
                        onChange={v => setSetting('hardwareDecoding', v)}
                        options={[
                            { v: 'auto', l: 'Automatic' },
                            { v: 'off', l: 'Off' },
                        ]}
                    />
                }
            />
            <Row
                title="Detected backend"
                desc={probe ? `${probeResult?.backend} available` : 'No backend detected    '}
                control={
                    <Button size="sm" icon="refresh" onClick={async () => await probeHardwareDecoding()}>
                        Re-detect
                    </Button>
                }
            />

            <Group>Rendering</Group>
            <Row
                title="Deinterlace"
                changed={isChanged('deinterlace')}
                onReset={() => resetSetting('deinterlace')}
                desc="Applied to interlaced sources. Auto enables it when the stream is flagged."
                control={
                    <Seg<Deint>
                        value={settings.deinterlace}
                        onChange={v => setSetting('deinterlace', v)}
                        options={[
                            { v: 'auto', l: 'Auto' },
                            { v: 'off', l: 'Off' },
                            { v: 'on', l: 'On' },
                        ]}
                    />
                }
            />
            <Row
                title="Default aspect ratio"
                changed={isChanged('defaultAspect')}
                onReset={() => resetSetting('defaultAspect')}
                desc="Used as the starting value each session. Changing this overrides any in-session aspect selection."
                control={
                    <Seg<'fit' | 'fill' | 'stretch'>
                        value={settings.defaultAspect}
                        onChange={v => setSetting('defaultAspect', v)}
                        options={[
                            { v: 'fit', l: 'Fit' },
                            { v: 'fill', l: 'Fill' },
                            { v: 'stretch', l: 'Stretch' },
                        ]}
                    />
                }
            />

            <Group>Capturing</Group>
            <Row
                title="Snapshot format"
                changed={isChanged('snapshotFormat')}
                onReset={() => resetSetting('snapshotFormat')}
                desc="Used when capturing the current frame."
                control={
                    <Seg<Snap>
                        value={settings.snapshotFormat}
                        onChange={v => setSetting('snapshotFormat', v)}
                        options={[
                            { v: 'png', l: 'PNG' },
                            { v: 'jpeg', l: 'JPEG' },
                            { v: 'webp', l: 'WebP' },
                        ]}
                    />
                }
            />
        </>
    );
}
