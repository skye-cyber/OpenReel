import { IconButton } from "./Button";
import { usePlayer } from "../state/PlayerContext";
import type { QueueItem } from "../types";
import { useEffect } from "react";


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
    const { queue, queueIndex, playQueueItem, setQueueOpen, pushEscapeHandler, popEscapeHandler } = usePlayer();

    useEffect(() => {
        pushEscapeHandler('queue', () => setQueueOpen(false));
        return () => popEscapeHandler('queue');
    }, [setQueueOpen, pushEscapeHandler, popEscapeHandler]);

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
                            className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-sm text-[12.5px] cursor-pointer
                    transition-colors hover:bg-hover
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

            <div className="p-2.5 px-3.5 border-t border-border text-[11px] text-text-3">
                Skipped {queue.filter((q: QueueItem) => q.bad).length} unplayable item{queue.filter((q: QueueItem) => q.bad).length === 1 ? '' : 's'}
            </div>
        </aside>
    );
}
