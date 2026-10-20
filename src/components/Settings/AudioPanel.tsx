import { useEffect, useState } from "react";
import { PlatformTools } from "../../lib/platform/system/tools";
import { Row } from "./Shared";
import type { AudioDevice } from "../../types";


export function AudioPanel() {
    const [devices, setDevices] = useState<AudioDevice[]>([]);
    const [selected, setSelected] = useState<string | null>(null);

    useEffect(() => {
        void PlatformTools.listAudioDevices().then(setDevices);
        void PlatformTools.getAudioDevice().then(setSelected);
    }, []);

    // Row:
    <Row
        title="Output device"
        desc={selected ? `Playing to ${selected}` : 'Using system default'}
        control={
            <select
                value={selected ?? ''}
                onChange={e => {
                    const v = e.target.value || null;
                    setSelected(v);
                    if (v) void PlatformTools.setAudioDevice(v);
                }}
                className="..."
            >
                <option value="">System default</option>
                {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.name}{d.isDefault ? ' (default)' : ''}</option>
                ))}
            </select>
        }
    />
}
