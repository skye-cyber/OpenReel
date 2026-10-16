/* ============================================================
 *  Search — filters across ALL categories, not just the active one
 *  ============================================================ */
import { useMemo } from "react";
import type { Cat } from "../../types/settings";
import { Button } from "../Button";
import { CATS } from "./Shared";
import Icon from "../../lib/Icons";

export function SearchResults({
    query, cat, setCat,
}: { query: string; cat: Cat; setCat: (c: Cat) => void }) {
    // The trick: render every panel into the DOM but hidden, so the browser's
    // own text search can't help us — we need our own index. For a spec-level
    // demo, we approximate by matching against category names and a small
    // keyword list. A real implementation would walk a structured settings
    // registry.
    const q = query.trim().toLowerCase();

    const matches = useMemo(() => {
        const all: Array<{ cat: Cat; label: string; hint: string }> = [
            { cat: 'playback', label: 'Resume where you left off', hint: 'Remember position between sessions' },
            { cat: 'playback', label: 'Resume threshold', hint: 'How far in before position is saved' },
            { cat: 'playback', label: 'Autoplay next item', hint: 'Continue into the queue' },
            { cat: 'playback', label: 'Previous restarts current', hint: 'Restart after 3 seconds' },
            { cat: 'playback', label: 'Coarse seek step', hint: 'Arrow key step size' },
            { cat: 'video', label: 'Hardware decoding', hint: 'GPU decode, automatic fallback' },
            { cat: 'video', label: 'Detected backend', hint: 'VA-API, VDPAU, VideoToolbox' },
            { cat: 'video', label: 'Deinterlace', hint: 'Interlaced sources' },
            { cat: 'video', label: 'Default aspect ratio', hint: 'Fit, fill, stretch' },
            { cat: 'video', label: 'Snapshot format', hint: 'PNG, JPEG, WebP' },
            { cat: 'appearance', label: 'Interface density', hint: 'Comfortable or compact rows' },
            { cat: 'appearance', label: 'Reduce motion', hint: 'Disable transitions' },
            { cat: 'appearance', label: 'Show status strip', hint: 'Buffering and error line' },
            { cat: 'appearance', label: 'Interface scale', hint: 'Follows system scaling' },
            { cat: 'library', label: 'Indexed folders', hint: 'Library sources' },
            { cat: 'library', label: 'Watch for changes', hint: 'Update index on file change' },
            { cat: 'library', label: 'Generate thumbnails', hint: 'Grid view previews' },
            { cat: 'library', label: 'Thumbnail cache', hint: 'Clear cached images' },
            { cat: 'library', label: 'Rebuild index', hint: 'Recreate search index' },
            { cat: 'library', label: 'Remove library', hint: 'Delete index, keep files' },
            { cat: 'plugins', label: 'Enable plugins', hint: 'Master switch' },
            { cat: 'plugins', label: 'Check for updates', hint: 'Query repositories' },
            { cat: 'plugins', label: 'Plugin sources', hint: 'Repositories' },
            { cat: 'plugins', label: 'Safe mode', hint: 'Start with plugins disabled' },
            { cat: 'advanced', label: 'Log level', hint: 'Error, warn, info, debug' },
            { cat: 'advanced', label: 'Open config folder', hint: 'Settings and plugin state' },
            { cat: 'advanced', label: 'Export settings', hint: 'Backup to a file' },
            { cat: 'advanced', label: 'Import settings', hint: 'Restore from a file' },
            { cat: 'advanced', label: 'Reset all settings', hint: 'Restore defaults' },
            { cat: 'advanced', label: 'Show welcome screen again', hint: 'First-launch experience' },
            { cat: 'privacy', label: 'Check for application updates', hint: 'Release server, once per day' },
            { cat: 'privacy', label: 'Allow plugins to use the network', hint: 'Override all plugin permissions' },
            { cat: 'privacy', label: 'What OpenReel stores', hint: 'Local data, no telemetry' },
        ];
        return all.filter(r =>
            r.label.toLowerCase().includes(q) || r.hint.toLowerCase().includes(q)
        );
    }, [q]);

    if (matches.length === 0) {
        return (
            <div className="py-10 text-center">
                <div className="text-[12.5px] text-text-2 mb-3">
                    No settings match “{query}”.
                </div>
                <Button size="sm">Clear search</Button>
            </div>
        );
    }

    return (
        <>
            <div className="text-[11px] text-text-3 mb-4">
                {matches.length} setting{matches.length === 1 ? '' : 's'} match “{query}”
            </div>
            {matches.map((m, i) => {
                const c = CATS.find(x => x.id === m.cat)!;
                return (
                    <button
                        key={i}
                        onClick={() => setCat(m.cat)}
                        className="flex items-center gap-3 w-full text-left p-[10px_12px] rounded-md
                border border-border bg-surface mb-1.5 transition-colors hover:border-border-2"
                    >
                        <Icon name={c.icon} size={15} className="text-text-3 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[12.5px] font-semibold">{m.label}</div>
                            <div className="text-[11px] text-text-3 truncate">{m.hint}</div>
                        </div>
                        <div className="text-[11px] text-text-3 shrink-0">{c.l}</div>
                    </button>
                );
            })}
        </>
    );
}
