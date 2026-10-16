import { useState } from "react";
import { Seg } from "../Segment";
import { Button } from "../Button";
import { Group, Row } from "./Shared";
import type { Hw, Deint, Snap } from "../../types/settings";

export function VideoPanel() {
    const [hw, setHw] = useState<Hw>('auto');
    const [deint, setDeint] = useState<Deint>('off');
    const [snap, setSnap] = useState<Snap>('jpeg');
    const [aspect, setAspect] = useState<'fit' | 'fill' | 'stretch'>('fit');

    return (
        <>
            <Group>Decoding</Group>
            <Row
                title="Hardware decoding"
                changed
                desc="Use the GPU to decode video. Falls back automatically when unavailable."
                control={
                    <Seg<Hw>
                        value={hw}
                        onChange={setHw}
                        options={[{ v: 'auto', l: 'Automatic' }, { v: 'off', l: 'Off' }]}
                    />
                }
            />
            <Row
                title="Detected backend"
                desc="VA-API (Intel Iris Xe) · unavailable: VDPAU"
                control={<Button size="sm" icon="refresh">Re-detect</Button>}
            />

            <Group>Rendering</Group>
            <Row
                title="Deinterlace"
                desc="Applied to interlaced sources. Auto enables it when the stream is flagged."
                control={
                    <Seg<Deint>
                        value={deint}
                        onChange={setDeint}
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
                desc="Used when a file does not declare its display aspect."
                control={
                    <Seg<'fit' | 'fill' | 'stretch'>
                        value={aspect}
                        onChange={setAspect}
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
                changed
                desc="Used when capturing the current frame."
                control={
                    <Seg<Snap>
                        value={snap}
                        onChange={setSnap}
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
