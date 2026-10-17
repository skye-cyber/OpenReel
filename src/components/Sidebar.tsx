import Icon from "../lib/Icons";
import { usePlayer } from "../state/PlayerContext";
import type { ViewId, IconName } from "../types";

interface NavItem { id: ViewId; l: string; ic: IconName }
interface NavGroup { group: string; items: NavItem[] }

const NAV: NavGroup[] = [
    { group: 'Playback',    items: [{ id: 'now',      l: 'Now Playing', ic: 'disc' }] },
{ group: 'Browse',      items: [
    { id: 'library',  l: 'Library',  ic: 'grid' },
    { id: 'plugins',  l: 'Plugins',  ic: 'plug' },
]},
{ group: 'Application', items: [{ id: 'settings', l: 'Settings',   ic: 'gear' }] },
];

export function Sidebar() {
    const { view, setView } = usePlayer();
    return (
        <aside className="w-54 shrink-0 flex flex-col bg-surface border-r border-border">
            <div className="flex-1 overflow-y-auto p-3 px-2.5">
                {NAV.map(({ group, items }) => (
                    <div key={group}>
                        <div className="nav-item text-[10px] font-bold tracking-[.09em] uppercase text-text-3 px-2.5 pt-3.5 pb-1.5 first:pt-0.5">{group}</div>
                        {items.map(it => (
                            <button
                                key={it.id}
                                onClick={() => setView(it.id)}
                                className={`nav-base nav-hover ${view === it.id
                                    ? 'bg-accent-soft text-text font-semibold before:content-[\'\'] before:absolute before:-left-2.5 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-4 before:rounded-r before:bg-accent'
                                    : ''}`}
                            >
                                <Icon name={it.ic} size={16} className={view === it.id ? 'text-accent' : ''} />
                                {it.l}
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            <div className="p-2.5 border-t border-border">
                <button
                    onClick={() => setView('shortcuts')}
                    className={`nav-base nav-hover ${view === 'shortcuts' ? 'bg-accent-soft text-text font-semibold' : ''}`}
                >
                    <Icon name="keyboard" size={16} className={view === 'shortcuts' ? 'text-accent' : ''} /> Shortcuts
                </button>
                <button
                    onClick={() => setView('about')}
                    className={`nav-base nav-hover ${view === 'about' ? 'bg-accent-soft text-text font-semibold' : ''}`}
                >
                    <Icon name="info" size={16} className={view === 'about' ? 'text-accent' : ''} /> About
                </button>
            </div>
        </aside>
    );
}
