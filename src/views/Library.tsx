import { useState, useMemo } from 'react';
import Icon from '../lib/Icons';
import { Button, IconButton } from '../components/Button';
import { Field } from '../components/Field';
import { usePlayer } from "../hooks/player";
import { LIBRARY, VIDEO } from '../data/mock';
import { ContextMenu } from '../components/ContextMenu/Menu';
import type { ContextMenuEntry } from '../types/contextmenu';
import type { LibraryRow } from '../types';
import { useContextMenu } from '../hooks/useContextMenu';
import { mediaFromLibraryRow, formatRelative } from '../helpers/herpers';
import { LibraryGrid } from '../components/LibraryGrid';

type Filter = 'all' | 'video' | 'audio' | 'unwatched' | 'missing';

const FILTERS: ReadonlyArray<{ id: Filter; l: string }> = [
    { id: 'all', l: 'All' },
    { id: 'video', l: 'Video' },
    { id: 'audio', l: 'Audio' },
    { id: 'unwatched', l: 'Unwatched' },
    { id: 'missing', l: 'Missing' },
];

export default function Library() {
    const { playMedia, toast, libraryMeta, scan, cancelScan, startScan, addFolderFromPicker } = usePlayer();
    const [filter, setFilter] = useState<Filter>('all');
    const [q, setQ] = useState('');
    const { state: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu<LibraryRow>();
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selected, setSelected] = useState(0);

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
    // The selected index is what lets selection persist across view-mode switches and across filtering
    const safeSel = Math.min(selected, Math.max(rows.length - 1, 0));

    const anyFilter = filter !== 'all' || q.trim().length > 0;

    const entriesFor = (row: LibraryRow): ContextMenuEntry[] => [
        { label: 'Play', icon: 'play', onSelect: () => playMedia(VIDEO) },
        { label: 'Play next', onSelect: () => toast(`"${row.t}" will play next`) },
        { label: 'Add to queue', onSelect: () => toast(`Added "${row.t}" to queue`) },
        { kind: 'separator' },
        { label: 'Show in file manager', icon: 'folder', onSelect: () => toast('Opened file manager') },
        {
            label: 'Copy path', icon: 'layers', onSelect: () => {
                navigator.clipboard?.writeText(row.p).catch(() => { });
                toast('Path copied');
            },
        },
        { kind: 'separator' },
        { label: 'Mark as watched', onSelect: () => toast(`Marked "${row.t}" as watched`) },
        { kind: 'separator' },
        {
            label: 'Remove from library', icon: 'trash', danger: true,
            onSelect: () => toast(`Removed "${row.t}" from library`),
        },
    ];

    const metaLine = scan?.inProgress
        ? `Scanning ${scan.currentFolder} · ${scan.itemsFound?.toLocaleString()}${scan.itemsExpected ? ` of ${scan.itemsExpected?.toLocaleString()}` : ''
        } items`
        : libraryMeta.lastScanAt === null
            ? `${libraryMeta.folders} folder${libraryMeta.folders === 1 ? '' : 's'} · not yet scanned`
            : `${libraryMeta.folders} folder${libraryMeta.folders === 1 ? '' : 's'} · ${libraryMeta.itemCount?.toLocaleString() || libraryMeta.itemCount} items · last scan ${formatRelative(libraryMeta.lastScanAt)}`;
    return (
        <div className="p-6.5 px-8 pb-10 max-w-[1180px]">
            <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">Library</h1>
            <p className="text-[12.5px] text-text-2 mb-5.5">{metaLine}</p>
            {scan?.inProgress && (
                <div className="flex items-center gap-3 mb-4.5">
                    <div className="flex-1 h-1 rounded-full bg-surface-3 overflow-hidden">
                        <div
                            className="h-full bg-accent transition-[width] duration-150"
                            style={{ width: `${scan.itemsExpected > 0 ? Math.min(100, scan.itemsFound / scan.itemsExpected * 100) : 0}%` }}
                        />
                    </div>
                    <button
                        onClick={cancelScan}
                        className="text-[11px] text-text-2 hover:text-text shrink-0"
                    >
                        Stop
                    </button>
                </div>
            )}
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
                <IconButton
                    icon="queue"
                    active={viewMode === 'list'}
                    title="List view"
                    onClick={() => setViewMode('list')}
                />
                <IconButton
                    icon="grid"
                    active={viewMode === 'grid'}
                    title="Grid view"
                    onClick={() => setViewMode('grid')}
                />
                <Button
                    size="sm"
                    icon="refresh"
                    disabled={scan?.inProgress}
                    onClick={startScan}
                >
                    {scan?.inProgress ? 'Scanning…' : 'Rescan'}
                </Button>
                <Button
                    size="sm"
                    icon="plus"
                    disabled={scan?.inProgress}
                    onClick={() => addFolderFromPicker()}
                >
                    Add folder
                </Button>
            </div>

            {rows.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="text-[12.5px] text-text-2 mb-3">
                        {libraryMeta.folders === 0
                            ? 'Library is empty. Add a folder to index your media.'
                            : anyFilter
                                ? 'No items match your filters.'
                                : 'Library is empty. Add a folder to get started.'}
                    </div>
                    {libraryMeta.folders === 0 ? (
                        <Button
                            size="sm"
                            variant="primary"
                            icon="plus"
                            onClick={() => void addFolderFromPicker()}
                        >
                            Add folder
                        </Button>
                    ) : anyFilter ? (
                        <Button size="sm" onClick={() => { setFilter('all'); setQ(''); }}>
                            Clear filters
                        </Button>
                    ) : null}
                </div>
            ) : viewMode == 'list' ? (
                <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                        <tr>
                            <th className="w-[42%] text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">Title</th>
                            {['Duration', 'Format', 'Added'].map(h => (
                                <th key={h} className="text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">{h}</th>
                            ))}
                            <th className="text-right text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">Plays</th>
                            <th className="text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r: LibraryRow, i) => (
                            <tr
                                key={i}
                                onClick={() => setSelected(i)}
                                onDoubleClick={async () => playMedia(await mediaFromLibraryRow(r))}
                                onContextMenu={e => openCtx(e, r)}
                                tabIndex={i === safeSel ? 0 : -1}
                                onKeyDown={async (e) => {
                                    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                                        openCtx(e, r);
                                    }
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        playMedia(await mediaFromLibraryRow(r));
                                    }
                                    if (e.key === 'ArrowDown' && i < rows.length - 1) {
                                        e.preventDefault();
                                        setSelected(i + 1);
                                    }
                                    if (e.key === 'ArrowUp' && i > 0) {
                                        e.preventDefault();
                                        setSelected(i - 1);
                                    }
                                }}

                                className={`cursor-pointer transition-colors focus:outline-none
                                ${i === safeSel ? 'bg-accent-soft' : 'hover:bg-surface focus-visible:bg-surface-2'}`}
                            >
                                <td className="px-3 py-2.5 border-b border-border">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7.5 h-7.5 rounded-sm bg-surface-2 border border-border flex items-center justify-center text-text-3 shrink-0">
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
            ) : (
                <LibraryGrid
                    rows={rows}
                    selected={safeSel}
                    onSelect={setSelected}
                    onPlay={async (r) => playMedia(await mediaFromLibraryRow(r))}
                    onContextMenu={(e, r) => openCtx(e, r)}
                />
            )}

            {ctxMenu && (
                <ContextMenu
                    position={ctxMenu.position}
                    entries={entriesFor(ctxMenu.payload)}
                    onClose={closeCtx}
                />
            )}
        </div>
    );
}
