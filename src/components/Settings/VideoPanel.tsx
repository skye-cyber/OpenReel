import { Group, Row } from './Shared';
import { Seg } from '../Segment';
import { Button } from '../Button';
import { usePlayer } from "../../hooks/player";
import type { Deint, Hw, Snap } from '../../types/settings';

export function VideoPanel() {
    const { settings, setSetting, isChanged, resetSetting, toast } = usePlayer();

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
                desc="VA-API (Intel Iris Xe) · unavailable: VDPAU"
                control={
                    <Button size="sm" icon="refresh" onClick={() => toast('Re-detected: VA-API available')}>
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
                desc="Used when a file does not declare its display aspect."
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
