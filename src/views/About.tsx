import { useEffect, useState } from 'react';
import Icon from '../lib/Icons';
import { Button } from '../components/Button';
import { usePlayer } from "../hooks/player";
import type { HardwareProbe, PlatformInfo } from '../types/platform';
import { platformtools } from '../lib/platform/system';
import { openExternal } from '../lib/platform/shell';

type Tab = 'about' | 'diag' | 'feed';

const TABS: ReadonlyArray<{ id: Tab; l: string }> = [
    { id: 'about', l: 'About' },
    { id: 'diag', l: 'Diagnostics' },
    { id: 'feed', l: 'Feedback' },
];

export default function About() {
    const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
    const [probe, setProbe] = useState<HardwareProbe | null>(null);
    const { aboutTab: tab, setAboutTab: setTab, plugins } = usePlayer();

    useEffect(() => {
        if (tab !== 'diag') return;
        void (async () => {
            const [info, hw] = await Promise.all([
                platformtools.getPlatformInfo(),
                platformtools.probeHardwareDecoding(),
            ]);
            setPlatformInfo(info);
            setProbe(hw);
        })();
    }, [tab])

    return (
        <div className="p-6.5 px-8 pb-10 max-w-[1180px]">
            <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">About OpenReel</h1>
            <p className="text-[12.5px] text-text-2 mb-5.5">Version 1.4.2 · build 20260914 · commit 8f3c1a7</p>

            <div className="flex gap-0.5 mb-6 border-b border-border">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => { setTab(t.id); console.log(tab, t.id); }}
                        className={`relative px-3.5 py-2.5 text-[12.5px] font-[550] transition-colors
                        ${tab === t.id
                                ? 'text-text after:content-[\'\'] after:absolute after:left-2.5 after:right-2.5 after:-bottom-px after:h-0.5 after:bg-accent after:rounded'
                                : 'text-text-3 hover:text-text-2'}`}
                    >
                        {t.l}
                    </button>
                ))}
            </div>

            {tab === 'about' && (
                <>
                    <div className="bg-surface border border-border rounded-lg p-[22px_24px] mb-5.5 flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-accent-dim border border-border-2 flex items-center justify-center text-accent shrink-0">
                            <Icon name="disc" size={26} />
                        </div>
                        <div className="flex-1">
                            <div className="text-[15px] font-[650] mb-0.5">OpenReel</div>
                            <div className="text-[12px] text-text-3">
                                A modular media player for Linux and other desktop platforms. Licensed under GPL-3.0.
                            </div>
                        </div>
                        <Button icon="download">Check for updates</Button>
                    </div>

                    <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2.5">Build</div>
                    <Dl rows={[
                        ['Operating system', platformInfo ? `${platformInfo.os} ${platformInfo.osVersion}` : '—'],
                        ['Session', platformInfo?.session ?? '—'],
                        ['GPU', platformInfo?.gpu ?? '—'],
                        ['Hardware decoding', probe
                            ? probe.available
                                ? `${probe.backend} · ${probe.codecs.join(', ')}`
                                : 'Unavailable — software decoding only'
                            : '—'],
                        ['Audio backend', platformInfo?.audioBackend ?? '—'],
                        ['Display scaling', platformInfo ? `${Math.round(platformInfo.displayScaling * 100)}%` : '—'],
                        ['Plugins loaded', `${plugins.filter(p => p.on).length} of ${plugins.length} installed`],
                    ]} />

                    <div className="flex gap-2 mt-5">
                        <Button disabled={true} size="sm" icon="external" onClick={() => void openExternal('https://openreel.example.org')}>
                            Website
                        </Button>
                        <Button size="sm" icon="external" onClick={() => void openExternal('https://github.com/skye-cyber/OpenReel.git')}>
                            Source Code
                        </Button>
                        <Button size="sm" icon="external" onClick={() => void openExternal('https://github.com/skye-cyber/OpenReel/issues')}>
                            Issue tracker
                        </Button>
                    </div>
                </>
            )}

            {tab === 'diag' && (
                <>
                    <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2.5">Environment</div>
                    <Dl rows={[
                        ['Operating system', 'Ubuntu 24.04.1 LTS (Linux 6.8.0)'],
                        ['Session', 'Wayland (compositor: GNOME Shell 46)'],
                        ['GPU', 'Intel Iris Xe Graphics (Mesa 24.0.9)'],
                        ['Hardware decoding', 'VA-API available · H.264, VP9, AV1'],
                        ['Audio backend', 'PipeWire 1.0.5 (via PulseAudio compatibility)'],
                        ['Display scaling', '125% · 2560 × 1440'],
                        ['Plugins loaded', '2 of 5 installed'],
                    ]} />

                    <div className="flex items-center gap-3 mt-6 mb-2.5">
                        <span className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3">Log</span>
                        <span className="flex-1" />
                        <button className="text-[11px] text-text-2 hover:text-text">Copy</button>
                        <button className="text-[11px] text-text-2 hover:text-text">Save log…</button>
                        <button className="text-[11px] text-text-2 hover:text-text">Open folder</button>
                    </div>
                    <div className="bg-[#08090b] border border-border rounded-md p-3 px-3.5 font-mono text-[11.5px] leading-loose max-h-[260px] overflow-y-auto text-[#8f98a3]">
                        {[
                            ['14:02:09', 'i', 'OpenReel 1.4.2 starting (Wayland session)'],
                            ['14:02:09', 'i', 'VA-API initialised: Intel Iris Xe, 3 decode profiles'],
                            ['14:02:10', 'i', 'Audio output: PipeWire, 48000 Hz, stereo'],
                            ['14:02:10', 'i', 'Loaded plugin: Subtitle Finder 2.1.0'],
                            ['14:02:10', 'i', 'Loaded plugin: OpenReel Visualizer 1.4.0'],
                            ['14:02:11', 'w', 'Conflict on hook "audio.visualiser" — Spectrum Overlay disabled'],
                            ['14:02:11', 'e', 'AV1 Decoder Pack failed to load: missing symbol libav1_decode_init'],
                            ['14:02:12', 'i', 'Ready — 0 sessions, 0 media loaded'],
                        ].map(([t, lv, msg], i) => (
                            <div key={i} className="flex gap-3">
                                <span className="text-[#4d545c] shrink-0">{t}</span>
                                <span className={`shrink-0 w-[46px] font-bold ${lv === 'i' ? 'text-[#5cba82]' : lv === 'w' ? 'text-[#d9a13b]' : 'text-[#e0645c]'
                                    }`}>
                                    {lv === 'i' ? 'INFO' : lv === 'w' ? 'WARN' : 'ERROR'}
                                </span>
                                <span>{msg}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {tab === 'feed' && (
                <>
                    <div className="bg-surface border border-border rounded-lg p-[22px_24px] mb-5">
                        <div className="text-[13px] font-[620] mb-1.5">Report a problem</div>
                        <div className="text-[12.5px] text-text-2 leading-relaxed max-w-[60ch] mb-4">
                            OpenReel does not send anything automatically. Copy the diagnostic report below and paste it into the
                            issue tracker so maintainers can reproduce the problem.
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button variant="primary" icon="external">Open issue tracker</Button>
                            <Button icon="download">Save diagnostic report…</Button>
                            <Button>Copy diagnostic report</Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-[11px_16px] rounded-md text-[12.5px]
            bg-surface border border-border">
                        <Icon name="lock" size={16} className="text-text-3" />
                        <div className="flex-1">
                            No telemetry, no analytics, no account. OpenReel only makes network requests for features you
                            explicitly enable.
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function Dl({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
    return (
        <dl className="grid grid-cols-[172px_1fr] m-0">
            {rows.map(([k, v]) => (
                <div key={k} className="contents">
                    <dt className="text-[11.5px] text-text-3 py-2.5 border-b border-border">{k}</dt>
                    <dd className="text-[12.5px] py-2.5 border-b border-border m-0 tabular-nums">{v}</dd>
                </div>
            ))}
        </dl>
    );
}
