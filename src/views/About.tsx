import { useEffect, useState } from 'react';
import Icon from '../lib/Icons';
import { Button } from '../components/Button';
import { usePlayer } from "../hooks/player";
import type { HardwareProbe, LogLine, LogTail, PlatformInfo } from '../types/platform';
import { PlatformTools as platformtools } from '../lib/platform/system/tools';
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
    const { aboutTab: tab, setAboutTab: setTab, plugins, toast } = usePlayer();
    const [logTail, setLogTail] = useState<LogTail | null>(null);
    const [logLoading, setLogLoading] = useState(false);
    const [version, setVersion] = useState<string>('-');

    const loadLog = async () => {
        setLogLoading(true);
        try {
            const tail = await platformtools.readLogTail(200);
            setLogTail(tail);
        } catch {
            setLogTail(null);
        } finally {
            setLogLoading(false);
        }
    };

    useEffect(() => {
        void (async () => {
            const [info, hw] = await Promise.all([
                platformtools.getPlatformInfo(),
                platformtools.probeHardwareDecoding(),
            ]);

            setPlatformInfo(info);
            setProbe(hw);
            // Get app Version
            const vs = await platformtools.getVersion()
            setVersion(vs)
            // Only load when we navigate to diagnostic tab, and log was never loaded before
            if (tab !== 'diag' || logTail) return;
            void loadLog();
        })();
    }, [tab])

    const copyLog = () => {
        if (logTail) {
            navigator.clipboard.writeText(
                logTail.lines.map((l: LogLine) => `[${l.timestamp}][${l.level}] ${l.message}`).join('\n')
            );
            toast("[LOG] Diagnostics copied", 'ok')
            return
        }
    }

    return (
        <div className="p-6.5 px-8 pb-10 max-w-[1180px] select-none">
            <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">About OpenReel</h1>
            <p className="text-[12.5px] text-text-2 mb-5.5">Version <span className='text-success font-semibold'>{version}</span> · OS <span className='text-accent'>{platformInfo?.os}</span></p>

            <div className="flex gap-0.5 mb-6 border-b border-border">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
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
                        <Button disabled icon="download">Check for updates</Button>
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
                    <div className="flex items-center gap-3 mt-6 mb-2.5">
                        <span className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3">Log</span>
                        <span className="flex-1" />
                        <button
                            disabled={(logTail ?? true) as boolean}
                            onClick={copyLog}
                            className="text-[11px] text-text-2 hover:text-text"
                        >
                            Copy
                        </button>
                        <button
                            onClick={() => {
                                setLogTail(null);
                                setLogLoading(true);
                                setTimeout(() => void loadLog(), 500)
                            }}
                            disabled={logLoading}
                            className="text-[11px] text-text-2 hover:text-text disabled:opacity-40"
                        >
                            {logLoading ? 'Loading…' : 'Refresh'}
                        </button>
                        {logTail?.path && logTail.path !== '(browser)' && (
                            <button
                                onClick={() => void platformtools.openPath(logTail.path)}
                                className="text-[11px] text-text-2 hover:text-text"
                            >
                                Open file
                            </button>
                        )}
                    </div>
                    {logTail?.error && (
                        <div className="text-[11px] text-warning mb-2">{logTail.error}</div>
                    )}

                    <div className="bg-log border border-border rounded-md p-3 px-3.5 font-mono text-[11.5px] leading-loose max-h-[320px] overflow-y-auto text-text">
                        {!logTail || logTail.lines.length === 0 ? (
                            <div className="text-text-2 italic">No log entries yet.</div>
                        ) : (
                            logTail.lines.map((l: LogLine, i: number) => (
                                <div key={i} className="flex gap-3">
                                    <span className="text-text-3 shrink-0">{l.timestamp}</span>
                                    <span
                                        className={`shrink-0 w-[46px] font-bold ${l.level.includes("ERROR")
                                                ? "text-danger"
                                                : l.level.includes("WARN")
                                                    ? "text-warning"
                                                    : "text-success"
                                            }`}
                                    >
                                        {l.level}
                                    </span>
                                    <span className="break-all">{l.message}</span>
                                </div>
                            ))
                        )}
                    </div>

                </>
            )}

            {tab === 'feed' && (
                <>
                    <div className="bg-surface border border-border rounded-lg p-[22px_24px] mb-5">
                        <div className="text-[13px] font-[620] mb-1.5">Report a problem</div>
                        <div className="text-[12.5px] text-text-2 leading-relaxed max-w-full mb-4">
                            OpenReel does not send anything automatically. Copy the diagnostic report below and paste it into the
                            issue tracker so maintainers can reproduce the problem.
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <Button onClick={() => { platformtools.openExternal('https://github.com/skye-cyber/OpenReel.git'); toast("Opened page in browser window", 'ok'); }} variant="primary" icon="external">Open issue tracker</Button>
                            <Button disabled icon="download">Save diagnostic report…</Button>
                            <Button disabled={logTail ? false : true} onClick={copyLog}>Copy diagnostic report</Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-[11px_16px] rounded-md text-[12.5px] bg-surface border border-border">
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
