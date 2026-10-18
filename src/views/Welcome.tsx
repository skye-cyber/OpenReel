import { useState } from 'react';
import Icon from '../lib/Icons';
import { Button } from '../components/Button';
import { Seg } from '../components/Segment';
import { usePlayer } from "../hooks/player";
import type { ThemePref } from '../types';
import type { HardwareProbe } from '../types/platform';
import { platformtools } from '../lib/platform/system';

type Probe = null | 'run' | 'ok' | 'no';

export default function Welcome() {
    const { applyScene, setView, toast, themePref, setThemePref } = usePlayer();
    const [hw, setHw] = useState<'a' | 'b'>('a');
    const [probe, setProbe] = useState<Probe>(null);
    const [probeResult, setProbeResult] = useState<HardwareProbe | null>(null);

    const probeText =
        probe === null ? 'Uses the GPU where a decoder is available.'
            : probe === 'run' ? 'Checking this device…'
                : 'VA-API available on this device — Intel Iris Xe.';

    return (
        <div className="min-h-full flex items-center justify-center p-10 px-6 relative
        before:content-[''] before:absolute before:inset-0 before:pointer-events-none
        before:bg-[radial-gradient(600px_340px_at_50%_22%,var(--color-accent-soft),transparent_70%)]">
            <div className="w-full max-w-[560px] relative">
                <h1 className="text-[26px] font-[680] tracking-[-.03em] mb-2">Welcome to OpenReel</h1>
                <p className="text-[13.5px] text-text-2 mb-6 max-w-[46ch]">
                    Two defaults to confirm. Everything here can be changed later in Settings.
                </p>

                <div className="bg-surface border border-border rounded-lg overflow-hidden shadow-md mb-4.5">
                    <div className="flex items-center gap-4.5 p-[15px_18px] border-b border-border">
                        <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-semibold mb-0.5">Theme</div>
                            <div className="text-[11.5px] text-text-3">Follows your system by default.</div>
                        </div>
                        <Seg<ThemePref>
                            value={themePref}
                            onChange={setThemePref}
                            options={[
                                { v: 'system', l: 'System' },
                                { v: 'light', l: 'Light' },
                                { v: 'dark', l: 'Dark' },
                            ]}
                        />
                    </div>

                    <div className="flex items-center gap-4.5 p-[15px_18px] border-b border-border">
                        <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-semibold mb-0.5">Hardware video decoding</div>
                            <div className="text-[11.5px] text-text-3">
                            {probe === null && 'Uses the GPU where a decoder is available.'}
                            {probe === 'run' && 'Checking this device…'}
                            {probe === 'ok' && probeResult && (
                                `${probeResult.backend} available on this device — ${probeResult.device}.`
                            )}
                            {probe === 'no' && 'No hardware decoder detected — software decoding will be used.'}
                            </div>
                        </div>
                        {probe === 'ok' ? (
                            <Seg<'a' | 'b'>
                                value={hw}
                                onChange={setHw}
                                options={[{ v: 'a', l: 'Automatic' }, { v: 'b', l: 'Off' }]}
                            />
                        ) : (
                            <Button
                                size="sm"
                                onClick={async () => {
                                    setProbe('run');
                                    try {
                                        const result = await platformtools.probeHardwareDecoding();
                                        setProbeResult(result);
                                        setProbe(result.available ? 'ok' : 'no' as Probe);
                                    } catch {
                                        setProbe('no'  as Probe);
                                    }
                                }}
                            >
                                Check support
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-4.5 p-[15px_18px]">
                        <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-semibold mb-0.5">Default player</div>
                            <div className="text-[11.5px] text-text-3">OpenReel will not change file associations on its own.</div>
                        </div>
                        <Button size="sm" onClick={() => toast('Opened system default-applications settings')}>
                            Set as default…
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2.5 items-center">
                    <Button variant="primary" onClick={() => applyScene('empty')}>Start using OpenReel</Button>
                    <Button onClick={() => setView('open')}>Open a file…</Button>
                </div>

                <div className="mt-4.5 text-[11.5px] text-text-3 flex items-center gap-1.5">
                    <Icon name="plug" size={14} />
                    OpenReel works fully without plugins. Add them later in Settings → Plugins.
                </div>
            </div>
        </div>
    );
}
