import { useState, useMemo } from 'react';
import Icon from '../lib/Icons';
import { Button, IconButton } from '../components/Button';
import { Field } from '../components/Field';
import { usePlayer } from '../state/PlayerContext';
import { LIBRARY, VIDEO } from '../data/mock';

type Filter = 'all' | 'video' | 'audio' | 'unwatched' | 'missing';

const FILTERS: ReadonlyArray<{ id: Filter; l: string }> = [
    { id: 'all', l: 'All' },
    { id: 'video', l: 'Video' },
    { id: 'audio', l: 'Audio' },
    { id: 'unwatched', l: 'Unwatched' },
    { id: 'missing', l: 'Missing' },
];

export default function Library() {
    const { playMedia } = usePlayer();
    const [filter, setFilter] = useState<Filter>('all');
    const [q, setQ] = useState('');

    const rows = useMemo(() => {
        const query = q.trim().toLowerCase();
        return LIBRARY.filter(r => {
            if (filter === 'missing' && !r.missing) return false;
            if (filter === 'video' && !/\.(mkv|mp4|avi|webm)$/i.test(r.p)) return false;
            if (filter === 'audio' && !/\.(flac|wav|mp3|m4a|ogg|opus)$/i.test(r.p)) return false;
            if (filter === 'unwatched' && r.pl > 0) return false;
            if (query) {
                const haystack = `${r.t} ${r.p} ${r.f}`.toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            return true;
        });
    }, [filter, q]);

    const anyFilter = filter !== 'all' || q.trim().length > 0;

    return (
        <div className="p-6.5 px-8 pb-10 max-w-[1180px]">
            <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">Library</h1>
            <p className="text-[12.5px] text-text-2 mb-5.5">3 folders · 8 412 items · last scan 4 minutes ago</p>

            <div className="flex items-center gap-2.5 mb-4.5 flex-wrap">
                <Field
                    icon="search"
                    placeholder="Search titles, paths, formats…"
                    value={q}
                    onValue={setQ}
                    style={{ maxWidth: 320, flex: '0 1 320px' }}
                />
                {FILTERS.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setFilter(c.id)}
                        className={`h-7 px-3 rounded-[20px] border text-[12px] transition-all
                ${filter === c.id
                                ? 'bg-accent-dim border-transparent text-accent font-semibold'
                                : 'bg-surface border-border-2 text-text-2 hover:border-border-3 hover:text-text'}`}
                    >
                        {c.l}
                    </button>
                ))}
                <div className="flex-1" />
                <IconButton icon="queue" active title="List view" />
                <IconButton icon="grid" title="Grid view" />
                <Button size="sm" icon="plus">Add folder</Button>
            </div>

            {rows.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="text-[12.5px] text-text-2 mb-3">
                        {anyFilter
                            ? <>No items match your filters.</>
                            : <>Library is empty. Add a folder to get started.</>}
                    </div>
                    {anyFilter && (
                        <Button size="sm" onClick={() => { setFilter('all'); setQ(''); }}>
                            Clear filters
                        </Button>
                    )}
                </div>
            ) : (
                <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                        <tr>
                            <th className="w-[42%] text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3
            px-3 pb-2.5 border-b border-border whitespace-nowrap">Title</th>
                            {['Duration', 'Format', 'Added'].map(h => (
                                <th key={h} className="text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3
                px-3 pb-2.5 border-b border-border whitespace-nowrap">{h}</th>
                            ))}
                            <th className="text-right text-[10px] font-bold tracking-[.08em] uppercase text-text-3
            px-3 pb-2.5 border-b border-border whitespace-nowrap">Plays</th>
                            <th className="text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3
            px-3 pb-2.5 border-b border-border whitespace-nowrap">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <tr
                                key={i}
                                onDoubleClick={() => playMedia(VIDEO)}
                                className="cursor-pointer transition-colors hover:bg-surface"
                            >
                                <td className="px-3 py-2.5 border-b border-border">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7.5 h-7.5 rounded-sm bg-surface-2 border border-border
                flex items-center justify-center text-text-3 shrink-0">
                                            <Icon name={r.f === 'FLAC' || r.f === 'WAV' ? 'music' : 'film'} size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-[550] truncate">{r.t}</div>
                                            <div className="text-[11px] text-text-3 truncate">{r.p}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 border-b border-border tabular-nums text-text-2">{r.d}</td>
                                <td className="px-3 py-2.5 border-b border-border text-text-3">{r.f}</td>
                                <td className="px-3 py-2.5 border-b border-border text-text-3">{r.a}</td>
                                <td className="px-3 py-2.5 border-b border-border tabular-nums text-text-2 text-right">{r.pl}</td>
                                <td className="px-3 py-2.5 border-b border-border">
                                    {r.missing ? (
                                        <span className="chip-base text-warning border-transparent bg-warning-dim">
                                            <Icon name="warn" size={10} /> Missing
                                        </span>
                                    ) : (
                                        <span className="chip-base">
                                            <span className="w-1.5 h-1.5 rounded-full bg-success" /> Available
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
