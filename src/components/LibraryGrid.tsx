import { useCallback, useRef, type KeyboardEvent } from 'react';
import Icon from '../lib/Icons';
import type { LibraryRow } from '../types';
import { usePlayer } from '../hooks/player';

interface LibraryGridProps {
    rows: LibraryRow[];
    selected: number;
    onSelect: (index: number) => void;
    onPlay: (row: LibraryRow) => void;
    onContextMenu: (e: React.MouseEvent, row: LibraryRow) => void;
}

export function LibraryGrid({
    rows, selected, onSelect, onPlay, onContextMenu,
}: LibraryGridProps) {
    const gridRef = useRef<HTMLDivElement>(null);
    const { settings } = usePlayer();
    const showThumb = settings.generateThumbnails;

    /* ----------------------------------------------------------
       Keyboard navigation.
       Grid is 4 columns conceptually — the actual DOM renders as a
       CSS grid with auto-flow, but arrow-key navigation needs a
       deterministic column count. We use 4 for navigation and let
       the visual layout reflow below that on narrower containers.
       ---------------------------------------------------------- */
    const COLS = 4;

    const move = useCallback((delta: number) => {
        const next = selected + delta;
        if (next < 0 || next >= rows.length) return;
        onSelect(next);
        requestAnimationFrame(() => {
            const el = gridRef.current?.querySelector<HTMLElement>(`[data-idx="${next}"]`);
            el?.focus();
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    }, [selected, rows.length, onSelect]);

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
        const row = rows[i];
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                move(1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                move(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                move(COLS);
                break;
            case 'ArrowUp':
                e.preventDefault();
                move(-COLS);
                break;
            case 'Home':
                e.preventDefault();
                move(-i);
                break;
            case 'End':
                e.preventDefault();
                move(rows.length - 1 - i);
                break;
            case 'Enter':
                e.preventDefault();
                if (row) onPlay(row);
                break;
            case ' ':
                e.preventDefault();
                onSelect(i);
                break;
            case 'ContextMenu':
                e.preventDefault();
                // Synthesize a context menu event at the tile's center.
                if (row) onContextMenu(e as unknown as React.MouseEvent, row);
                break;
        }
    };

    return (
        <div
            ref={gridRef}
            role="grid"
            aria-rowcount={Math.ceil(rows.length / COLS)}
            aria-colcount={COLS}
            className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]"
        >
            {rows.map((r, i) => {
                const active = i === selected;
                const isAudio = r.f === 'FLAC' || r.f === 'WAV' || /\.(flac|wav|mp3|m4a|ogg|opus)$/i.test(r.p);
                return (
                    <div
                        key={i}
                        data-idx={i}
                        role="gridcell"
                        tabIndex={i === selected ? 0 : -1}
                        onClick={() => onSelect(i)}
                        onDoubleClick={() => onPlay(r)}
                        onContextMenu={e => onContextMenu(e, r)}
                        onKeyDown={e => handleKeyDown(e, i)}
                        className={`group flex flex-col rounded-lg overflow-hidden cursor-pointer border transition-all focus:outline-none
                          ${active
                                ? 'border-accent bg-accent-soft ring-1 ring-accent'
                                : 'border-border bg-surface hover:border-border-2 hover:bg-surface-2'} focus-visible:ring-2 focus-visible:ring-accent`}
                    >
                        {/* Thumbnail */}
                        <div className="relative aspect-video bg-surface-2 flex items-center justify-center overflow-hidden">
                            {showThumb && (
                                <div className={`flex items-center justify-center transition-transform ${active ? 'scale-105' : 'group-hover:scale-105'}`}>
                                    <Icon
                                        name={isAudio ? 'music' : 'film'}
                                        size={48}
                                        className="text-text-3 opacity-70"
                                    />
                                </div>
                            )}


                            {/* Duration badge */}
                            {r.d && r.d !== '—' && (
                                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-sm
                                bg-[rgba(0,0,0,.72)] text-[10px] font-mono text-white/90 tabular-nums">
                                    {r.d}
                                </div>
                            )}

                            {/* Status badge */}
                            {r.missing && (
                                <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-sm
                                bg-warning-dim text-warning text-[9.5px] font-semibold uppercase tracking-wider
                                flex items-center gap-1">
                                    <Icon name="warn" size={9} />
                                    Missing
                                </div>
                            )}
                        </div>

                        {/* Title + meta */}
                        <div className="px-2.5 py-2 flex flex-col gap-0.5 min-w-0">
                            <div
                                className={`text-[12px] font-[550] truncate ${active ? 'text-accent' : 'text-text'}`}
                                title={r.t}
                            >
                                {r.t}
                            </div>
                            <div className="text-[10.5px] text-text-3 truncate tabular-nums">
                                {r.f} · {r.pl > 0 ? `${r.pl} play${r.pl === 1 ? '' : 's'}` : 'Unwatched'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

