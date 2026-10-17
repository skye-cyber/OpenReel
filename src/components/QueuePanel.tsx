import { useEffect } from 'react';
import { IconButton } from './Button';
import { ContextMenu } from './ContextMenu/Menu';
import { usePlayer } from '../state/PlayerContext';
import type { QueueItem } from '../types';
import type { ContextMenuEntry } from '../types/contextmenu';
import { useContextMenu } from '../lib/useContextMenu';

function EqBars() {
    return (
        <div className="flex gap-0.5 items-end h-[11px] justify-center">
            <i className="w-0.5 h-[5px]  bg-accent rounded-[1px] animate-[eq_.9s_ease-in-out_infinite]" style={{ animationDelay: '0s' }} />
            <i className="w-0.5 h-[10px] bg-accent rounded-[1px] animate-[eq_.9s_ease-in-out_infinite]" style={{ animationDelay: '.18s' }} />
            <i className="w-0.5 h-[6px]  bg-accent rounded-[1px] animate-[eq_.9s_ease-in-out_infinite]" style={{ animationDelay: '.36s' }} />
        </div>
    );
}

export function QueuePanel() {
    const {
        queue, queueIndex, playQueueItem, setQueueOpen,
        pushEscapeHandler, popEscapeHandler, setView, toast,
    } = usePlayer();

    const { state: ctxMenu, open: openCtx, close: closeCtx } =
        useContextMenu<{ item: QueueItem; index: number }>();

    useEffect(() => {
        pushEscapeHandler('queue', () => setQueueOpen(false));
        return () => popEscapeHandler('queue');
    }, [setQueueOpen, pushEscapeHandler, popEscapeHandler]);

    const entriesFor = (item: QueueItem, index: number): ContextMenuEntry[] => [
        {
            label: 'Play now', icon: 'play', disabled: item.bad,
            onSelect: () => playQueueItem(index),
        },
        {
            label: 'Play next', disabled: item.bad,
            onSelect: () => toast(`"${item.n}" will play next`),
        },
        { kind: 'separator' },
        { label: 'Move to top', onSelect: () => toast(`"${item.n}" moved to top`) },
        { label: 'Show in library', icon: 'grid', onSelect: () => setView('library') },
        {
            label: 'Copy path', icon: 'layers', onSelect: () => {
                navigator.clipboard?.writeText(item.n).catch(() => { });
                toast('Path copied');
            },
        },
        { kind: 'separator' },
        {
            label: 'Remove from queue', icon: 'x', danger: true,
            onSelect: () => toast(`Removed "${item.n}" from queue`),
        },
    ];

    const skipped = queue.filter((q: QueueItem) => q.bad).length;

    return (
        <aside className="w-[330px] shrink-0 flex flex-col bg-surface border-l border-border animate-slide-in">
            <div className="flex items-center gap-2 p-3 px-3.5 border-b border-border">
                <div className="text-[12.5px] font-[650]">Queue</div>
                <div className="text-[11px] text-text-3">{queue.length} items</div>
                <div className="flex-1" />
                <IconButton icon="shuffle" size={15} title="Shuffle" />
                <IconButton icon="repeat" size={15} title="Repeat: off" />
                <IconButton icon="chevDown" size={15} title="More" />
                <IconButton icon="x" size={15} title="Close queue" onClick={() => setQueueOpen(false)} />
            </div>

            <div className="flex-1 overflow-y-auto p-1.5">
                {queue.map((q: QueueItem, i: number) => {
                    const active = i === queueIndex;
                    return (
                        <div
                            key={i}
                            onClick={() => playQueueItem(i)}
                            onContextMenu={e => openCtx(e, { item: q, index: i })}
                            tabIndex={0}
                            onKeyDown={e => {
                                if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                                    openCtx(e, { item: q, index: i });
                                }
                            }}
                            className={`q-row flex items-center gap-2.5 px-2.5 py-[7px] rounded-sm text-[12.5px] cursor-pointer transition-colors hover:bg-hover focus:outline-none focus-visible:bg-surface-2
                    ${active ? 'bg-accent-soft' : ''}`}
                        >
                            <div className="w-4 text-[11px] text-text-3 text-center shrink-0 tabular-nums">
                                {active ? <EqBars /> : i + 1}
                            </div>
                            <div className={`flex-1 min-w-0 truncate ${active ? 'text-accent font-semibold' : ''}`}>
                                {q.n}
                            </div>
                            {q.bad
                                ? <span className="chip-base text-danger border-transparent bg-danger-dim" style={{ height: 18, fontSize: 10 }}>Can't play</span>
                                : <div className="text-[11px] text-text-3 tabular-nums">{q.d}</div>}
                        </div>
                    );
                })}
                <div className="p-3.5 px-2.5 text-[11px] text-text-3">
                    Drag to reorder · <span className="kbd">Alt</span> + <span className="kbd">↑</span> <span className="kbd">↓</span>
                </div>
            </div>

            {skipped > 0 && (
                <div className="p-2.5 px-3.5 border-t border-border text-[11px] text-text-3">
                    Skipped {skipped} unplayable item{skipped === 1 ? '' : 's'}
                </div>
            )}

            {ctxMenu && (
                <ContextMenu
                    position={ctxMenu.position}
                    entries={entriesFor(ctxMenu.payload.item, ctxMenu.payload.index)}
                    onClose={closeCtx}
                />
            )}
        </aside>
    );
}
