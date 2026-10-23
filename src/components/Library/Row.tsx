import Icon from "../../lib/Icons";
import { formatDuration } from "../../helpers/media";
import { useEffect, useState } from "react";
import { isTauri } from "../../lib/platform/system/shared";
import type { Row } from "../../types/library";
import { librarymanager } from "../../lib/platform/library";
import type { MediaProbe } from "../../types/media";


export function Row({
    row, index, isSelected, onSelect, onPlay, onContextMenu, onNavigate,
}: {
    row: Row;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onPlay: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onNavigate: (delta: number) => void;
}) {
    const [probe, setProbe] = useState<MediaProbe | null>(null);

    useEffect(() => {
        if (!isTauri) return;
        let cancelled = false;
        void librarymanager.probeMediaFile(row.path).then(p => {
            if (!cancelled) setProbe(p);
        }).catch(() => { });
        return () => { cancelled = true; };
    }, [row.path]);

    const displayDuration = probe
        ? formatDuration(probe.duration)
        : row.duration;

    const isAudio = probe?.hasAudio && !probe?.hasVideo;

    return (
        <tr
            key={index}
            onClick={onSelect}
            onDoubleClick={onPlay}
            onContextMenu={onContextMenu}
            tabIndex={isSelected ? 0 : -1}
            onKeyDown={e => {
                if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                    onContextMenu(e as unknown as React.MouseEvent);
                }
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onPlay();
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    onNavigate(1);
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    onNavigate(-1);
                }
            }}
            className={`cursor-pointer transition-colors focus:outline-none
            ${isSelected ? 'bg-accent-soft' : 'hover:bg-surface focus-visible:bg-surface-2'}`}
        >
            <td className="px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7.5 h-7.5 rounded-sm bg-surface-2 border border-border flex items-center justify-center text-text-3 shrink-0">
                        <Icon name={isAudio ? 'music' : 'film'} size={15} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-[550] truncate">{row.title}</div>
                        <div className="text-[11px] text-text-3 truncate">{row.path}</div>
                    </div>
                </div>
            </td>
            <td className="px-3 py-2.5 border-b border-border tabular-nums text-text-2">{displayDuration}</td>
            <td className="px-3 py-2.5 border-b border-border text-text-3">{row.format}</td>
            <td className="px-3 py-2.5 border-b border-border tabular-nums text-text-2">{row.size}</td>
            <td className="px-3 py-2.5 border-b border-border tabular-nums text-text-2 text-right">{row.plays}</td>
            <td className="px-3 py-2.5 border-b border-border">
                {row.missing ? (
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
    );
}
