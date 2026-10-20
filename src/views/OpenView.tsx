import { useState, useMemo } from 'react';
import Icon from '../lib/Icons';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Seg } from '../components/Segment';
import { usePlayer } from "../hooks/player";
import { OPEN_FILES } from '../data/mock';
import { mediaFromOpenFile } from '../helpers/herpers';

type Filter = 'media' | 'all';

export default function OpenView() {
    const { playMedia } = usePlayer();
    const [sel, setSel] = useState(0);
    const [filter, setFilter] = useState<Filter>('media');
    const [q, setQ] = useState('');

    const rows = useMemo(() => {
        const query = q.trim().toLowerCase();
        return OPEN_FILES.filter(r => {
            if (filter === 'media' && r.k === 'file') return false;
            if (query && !`${r.n} ${r.p}`.toLowerCase().includes(query)) return false;
            return true;
        });
    }, [filter, q]);

    // Keep `sel` in bounds when the filter changes.
    const safeSel = Math.min(sel, Math.max(rows.length - 1, 0));
    const f = rows[safeSel];

    return (
        <div className="min-h-full flex flex-col overflow-y-hidden">
            <div className="px-5.5 py-4 border-b border-border flex items-center gap-3.5">
                <div className="flex items-center gap-1.5 text-[12px] text-text-3">
                    <span>Home</span><span className="opacity-40">/</span>
                    <span>Videos</span><span className="opacity-40">/</span>
                    <b className="text-text font-semibold">Course</b>
                </div>
                <div className="flex-1" />
                <Field
                    icon="search"
                    placeholder="Filter files…"
                    value={q}
                    onValue={setQ}
                    style={{ maxWidth: 220, flex: '0 1 220px' }}
                />
                <Seg<Filter>
                    value={filter}
                    onChange={setFilter}
                    options={[
                        { v: 'media', l: 'Media files' },
                        { v: 'all', l: 'All files' },
                    ]}
                />
            </div>

            <div className="flex min-h-0 overflow-y-hidden">
                <div className="flex-1 min-w-0 min-w-[70%] max-h-[40%] overflow-y-auto">
                    {rows.length === 0 ? (
                        <div className="py-16 text-center text-[12.5px] text-text-2">
                            No files match “{q}”.
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-[12.5px]">
                            <thead>
                                <tr>
                                    {['Name', 'Type', 'Size', 'Modified'].map(h => (
                                        <th key={h} className="text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">{h}</th>
                                    ))}
                                    <th className="text-right text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr
                                        key={`${r.n}-${i}`}
                                        onClick={() => setSel(i)}
                                        onDoubleClick={async() => r.k !== 'file' && playMedia(await mediaFromOpenFile(r))}
                                        className={`transition-colors ${r.k !== 'file' ? 'cursor-pointer' : 'cursor-default'} ${i === safeSel ? 'bg-accent-soft' : 'hover:bg-surface'}`}
                                    >
                                        <td className="px-3 py-2.5 border-b border-border">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-7.5 h-7.5 rounded-sm bg-surface-2 border border-border flex items-center justify-center text-text-3 shrink-0">
                                                    <Icon name={r.k === 'audio' ? 'music' : r.k === 'file' ? 'layers' : 'film'} size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-[550] truncate">{r.n}</div>
                                                    <div className="text-[11px] text-text-3 truncate">{r.p}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 border-b border-border text-text-3">{r.t}</td>
                                        <td className="px-3 py-2.5 border-b border-border tabular-nums text-text-2">{r.s}</td>
                                        <td className="px-3 py-2.5 border-b border-border text-text-3">{r.m}</td>
                                        <td className="px-3 py-2.5 border-b border-border tabular-nums text-text-2 text-right">{r.d}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex-1 w-[280px] h-[420px] shrink-0 border-l border-border p-5 overflow-y-auto bg-surface overflow-y-scroll">
                    {f ? (
                        <>
                            <div className="w-11 h-11 rounded-sm bg-surface-2 border border-border flex items-center justify-center text-text-3 mb-3.5">
                                <Icon name={f.k === 'audio' ? 'music' : f.k === 'file' ? 'layers' : 'film'} size={20} />
                            </div>
                            <h4 className="text-[12.5px] font-[650] mb-1 break-all">{f.n}</h4>
                            <div className="text-[11px] text-text-3 mb-4.5 break-all">~/Videos/Course/{f.n}</div>

                            <Dl
                                rows={[
                                    ['Duration', f.d],
                                    ['Container', f.t],
                                    ...(f.k === 'file'
                                        ? []
                                        : ([
                                            ['Video', 'H.264 · 1920×1080 · 23.976 fps'],
                                            ['Audio', 'AC-3 · 5.1 · 48 kHz'],
                                            ['Subtitles', '2 tracks (English, German)'],
                                        ] as const)),
                                    ['Size', f.s],
                                ]}
                            />

                            {f.k !== 'file' ? (
                                <Button variant="primary" icon="play" onClick={async() => playMedia(await mediaFromOpenFile(f))} className="w-full mt-5">
                                    Open
                                </Button>
                            ) : (
                                <Button disabled className="w-full mt-5">
                                    Not a media file
                                </Button>
                            )}
                        </>
                    ) : (
                        <div className="text-[12px] text-text-3 text-center py-12">
                            Select a file to see details.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Dl({ rows }: { rows: ReadonlyArray<readonly [string, string]> }) {
    return (
        <dl className="grid grid-cols-1">
            {rows.map(([k, v], i) => (
                <div key={k} className="contents">
                    <dt className={`text-[11.5px] text-text-3 py-2.5 ${i < rows.length - 1 ? 'border-b border-border' : ''}`}>
                        {k}
                    </dt>
                    <dd className={`text-[12.5px] py-2.5 m-0 tabular-nums ${i < rows.length - 1 ? 'border-b border-border' : ''}`}>
                        {v}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
