import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, IconButton } from '../components/Button';
import { Field } from '../components/Field';
import { usePlayer } from '../hooks/player';
import { ContextMenu } from '../components/ContextMenu/Menu';
import type { ContextMenuEntry } from '../types/contextmenu';
import { useContextMenu } from '../hooks/useContextMenu';
import { mediaFromPath, formatRelative } from '../helpers/herpers';
import { LibraryGrid } from '../components/LibraryGrid';
import type { LibraryFile } from '../types/library';
import type { Filter, Row as RowType } from '../types/library';
import { FILTERS, rowFromFile } from '../helpers/library';
import { Row } from '../components/Library/Row';
import { librarymanager } from '../lib/platform/library';


export default function Library() {
    const p = usePlayer();
    const [filter, setFilter] = useState<Filter>('all');
    const [q, setQ] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [selected, setSelected] = useState(0);

    const [files, setFiles] = useState<LibraryFile[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const { state: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu<RowType>();

    //Load page
    const loadPage = useCallback(async (offset: number) => {
        setLoadingFiles(true);
        try {
            const page = await librarymanager.getLibraryPage(offset, 200);
            if (offset === 0) setFiles(page);
            else setFiles(prev => [...prev, ...page]);
            setHasMore(page.length === 200);
        } catch (err) {
            console.error('[Library] load page failed', err);
            p.toast('Failed to load library page', 'err');
        } finally {
            setLoadingFiles(false);
        }
    }, [p.toast]);

    useEffect(() => {
        void loadPage(0);
    }, [loadPage, p.libraryIndexReady]);

    useEffect(() => {
        void loadPage(0);
    }, [loadPage, p.libraryIndexReady]);

    // Unified rows
    const allRows: RowType[] = useMemo(() => {
        return files.map(rowFromFile);
    }, [files, p.lastScanId]);

    const rows = useMemo(() => {
        const query = q.trim().toLowerCase();
        return allRows.filter(r => {
            if (filter === 'missing' && !r.missing) return false;
            if (filter === 'video' && r.format !== 'Video' && r.format !== 'MKV' && r.format !== 'MP4' && r.format !== 'WEBM' && r.format !== 'AVI') return false;
            if (filter === 'audio' && r.format !== 'Audio' && r.format !== 'FLAC' && r.format !== 'WAV' && r.format !== 'MP3') return false;
            if (filter === 'unwatched' && r.plays > 0) return false;
            if (query) {
                const haystack = `${r.title} ${r.path} ${r.format}`.toLowerCase();
                if (!haystack.includes(query)) return false;
            }
            return true;
        });
    }, [allRows, filter, q]);

    const safeSel = Math.min(selected, Math.max(rows.length - 1, 0));
    const anyFilter = filter !== 'all' || q.trim().length > 0;

    //Context menu
    const entriesFor = (row: RowType): ContextMenuEntry[] => [
        {
            label: 'Play', icon: 'play', onSelect: async () => {
                const media = await mediaFromPath(row.path);
                p.playMedia(media);
            }
        },
        { label: 'Play next', onSelect: () => p.toast(`"${row.title}" will play next`) },
        { label: 'Add to queue', onSelect: () => p.toast(`Added "${row.title}" to queue`) },
        { kind: 'separator' },
        { label: 'Show in file manager', icon: 'folder', onSelect: () => p.toast('Opened file manager') },
        {
            label: 'Copy path', icon: 'layers', onSelect: () => {
                navigator.clipboard?.writeText(row.path).catch(() => { });
                p.toast('Path copied');
            },
        },
        { kind: 'separator' },
        { label: 'Mark as watched', onSelect: () => p.toast(`Marked "${row.title}" as watched`) },
        { kind: 'separator' },
        {
            label: 'Remove from library', icon: 'trash', danger: true,
            onSelect: () => p.toast(`Removed "${row.title}" from library`),
        },
    ];

    // Header meta line
    const metaLine = p.scan?.inProgress
        ? `Scanning ${p.scan.currentFolder} · ${p.scan.itemsFound?.toLocaleString()}${p.scan.itemsExpected ? ` of ${p.scan.itemsExpected.toLocaleString()}` : ''
        } items`
        : p.libraryMeta.lastScanAt === null
            ? `${p.libraryMeta.folders} folder${p.libraryMeta.folders === 1 ? '' : 's'} · not yet scanned`
            : `${p.libraryMeta.folders} folder${p.libraryMeta.folders === 1 ? '' : 's'} · ${p.libraryMeta.itemCount.toLocaleString()} items · last scan ${formatRelative(p.libraryMeta.lastScanAt)}`;

    return (
        <div className="p-6.5 px-8 pb-10 max-w-[1180px]">
            <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">Library</h1>
            <p className="text-[12.5px] text-text-2 mb-5.5">{metaLine}</p>

            {/* Scan progress bar */}
            {p.scan?.inProgress && (
                <div className="flex items-center gap-3 mb-4.5">
                    <div className="flex-1 h-1 rounded-full bg-surface-3 overflow-hidden">
                        <div
                            className="h-full bg-accent transition-[width] duration-150"
                            style={{
                                width: `${p.scan.itemsExpected > 0
                                    ? Math.min(100, (p.scan.itemsFound / p.scan.itemsExpected) * 100)
                                    : 0}%`,
                            }}
                        />
                    </div>
                    <button
                        onClick={p.cancelScan}
                        className="text-[11px] text-text-2 hover:text-text shrink-0"
                    >
                        Stop
                    </button>
                </div>
            )}

            {/* Toolbar */}
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
                    disabled={p.scan?.inProgress}
                    onClick={() => void p.startScan()}
                >
                    {p.scan?.inProgress ? 'Scanning…' : 'Rep.scan'}
                </Button>
                <Button
                    size="sm"
                    icon="plus"
                    disabled={p.scan?.inProgress}
                    onClick={() => void p.addFolderFromPicker()}
                >
                    Add folder
                </Button>
            </div>

            {/* Empty state */}
            {!files || files.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="text-[12.5px] text-text-2 mb-3">
                        {!p.libraryIndexReady && p.libraryMeta.folders > 0
                            ? 'Scanning library…'
                            : p.libraryMeta.folders === 0
                                ? 'Library is empty. Add a folder to index your media.'
                                : anyFilter
                                    ? 'No items match your filters.'
                                    : 'No files found in the indexed folders.'}
                    </div>
                    {p.libraryMeta.folders === 0 ? (
                        <Button
                            size="sm"
                            variant="primary"
                            icon="plus"
                            onClick={() => void p.addFolderFromPicker()}
                        >
                            Add folder
                        </Button>
                    ) : anyFilter ? (
                        <Button size="sm" onClick={() => { setFilter('all'); setQ(''); }}>
                            Clear filters
                        </Button>
                    ) : null}
                </div>
            ) : viewMode === 'list' ? (
                <table className="w-full border-collapse text-[12.5px]">
                    <thead>
                        <tr>
                            <th className="w-[42%] text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">Title</th>
                            {['Duration', 'Format', 'Size'].map(h => (
                                <th key={h} className="text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">{h}</th>
                            ))}
                            <th className="text-right text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">Plays</th>
                            <th className="text-left text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-3 pb-2.5 border-b border-border whitespace-nowrap">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r, i) => (
                            <Row
                                key={r.id}
                                row={r}
                                index={i}
                                isSelected={i === safeSel}
                                onSelect={() => setSelected(i)}
                                onPlay={async () => p.playMedia(await mediaFromPath(r.path))}
                                onContextMenu={e => openCtx(e, r)}
                                onNavigate={(delta) => setSelected(Math.max(0, Math.min(rows.length - 1, i + delta)))}
                            />
                        ))}
                    </tbody>
                </table>
            ) : (
                <LibraryGrid
                    rows={rows.map(r => ({
                        t: r.title,
                        p: r.path,
                        d: r.duration,
                        f: r.format,
                        a: '',
                        pl: r.plays,
                        missing: r.missing,
                    }))}
                    selected={safeSel}
                    onSelect={setSelected}
                    onPlay={async (r) => p.playMedia(await mediaFromPath(r.p))}
                    onContextMenu={(e, r) => {
                        const row = rows.find(x => x.path === r.p);
                        if (row) openCtx(e, row);
                    }}
                />
            )}

            {/* Load more */}
            {hasMore && (
                <div className="text-center py-6">
                    <Button
                        size="sm"
                        onClick={() => void loadPage(files.length)}
                        disabled={loadingFiles}
                    >
                        {loadingFiles ? 'Loading…' : 'Load more'}
                    </Button>
                </div>
            )}

            {/* Context menu */}
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

