import { useState } from 'react';
import { Field } from '../components/Field';

interface Row { l: string; keys: string[]; pending?: boolean }
interface Group { t: string; rows: Row[] }

const GROUPS: Group[] = [
    {
        t: 'Playback',
        rows: [
            { l: 'Play / Pause', keys: ['Space'] },
            { l: 'Seek −5 s / +5 s', keys: ['←', '→'] },
            { l: 'Seek −1 s / +1 s', keys: ['Shift', '←/→'] },
            { l: 'Volume +5% / −5%', keys: ['↑', '↓'] },
            { l: 'Mute', keys: ['M'] },
            { l: 'Speed down / up', keys: ['[', ']'] },
            { l: 'Reset speed', keys: ['Backspace'] },
            { l: 'Previous / next item', keys: ['P', 'N'] },
        ],
    },
    {
        t: 'View & window',
        rows: [
            { l: 'Fullscreen', keys: ['F', 'F11'] },
            { l: 'Exit fullscreen', keys: ['Esc'] },
            { l: 'Now Playing', keys: ['Ctrl', '1'] },
            { l: 'Library', keys: ['Ctrl', '2'] },
            { l: 'Plugins', keys: ['Ctrl', '3'] },
            { l: 'Settings', keys: ['Ctrl', '4'] },
            { l: 'Preferences', keys: ['Ctrl', ','] },
            { l: 'Mini player', keys: ['Ctrl', 'Shift', 'M'], pending: true },
        ],
    },
    {
        t: 'Queue & tracks',
        rows: [
            { l: 'Toggle queue panel', keys: ['Q'] },
            { l: 'Cycle repeat', keys: ['R'] },
            { l: 'Toggle shuffle', keys: ['Shift', 'R'] },
            { l: 'Cycle audio track', keys: ['A'] },
            { l: 'Cycle subtitles', keys: ['V'] },
        ],
    },
    {
        t: 'Application',
        rows: [
            { l: 'Open file', keys: ['Ctrl', 'O'] },
            { l: 'Close media', keys: ['Ctrl', 'W'] },
            { l: 'Search current view', keys: ['Ctrl', 'F'] },
            { l: 'Shortcut reference', keys: ['F1'] },
            { l: 'Diagnostics', keys: ['Ctrl', 'Shift', 'D'] },
            { l: 'Media info', keys: ['I'], pending: true },
        ],
    },
];

export default function Shortcuts() {
    const [q, setQ] = useState('');

    const query = q.trim().toLowerCase();

    const filtered = GROUPS
        .map(g => ({
            ...g,
            rows: g.rows.filter(r => {
                if (!query) return true;
                const label = r.l.toLowerCase();
                const keys = r.keys.join(' ').toLowerCase();
                return label.includes(query) || keys.includes(query);
            }),
        }))
        .filter(g => g.rows.length > 0);

    const total = filtered.reduce((n, g) => n + g.rows.length, 0);

    return (
        <div className="p-6.5 px-8 pb-10 max-w-[1180px]">
            <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">Keyboard shortcuts</h1>
            <p className="text-[12.5px] text-text-2 mb-5.5">
                Shortcuts are currently fixed. Press a key combination to find it in the list.
            </p>

            <div className="mb-6.5 max-w-[360px]">
                <Field
                    icon="search"
                    placeholder="Try 'subtitle' or 'Ctrl+O'"
                    value={q}
                    onValue={setQ}
                />
            </div>

            {query && (
                <div className="text-[11px] text-text-3 mb-4">
                    {total} shortcut{total === 1 ? '' : 's'} match “{q}”
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="py-16 text-center">
                    <div className="text-[12.5px] text-text-2 mb-3">No shortcuts match “{q}”.</div>
                    <button
                        onClick={() => setQ('')}
                        className="text-[12px] text-accent hover:underline"
                    >
                        Clear search
                    </button>
                </div>
            ) : (
                <div className="grid gap-x-10 gap-y-0 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
                    {filtered.map(g => (
                        <div key={g.t} className="mb-6.5">
                            <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2.5">
                                {g.t}
                            </div>
                            {g.rows.map(r => (
                                <div
                                    key={r.l}
                                    className="flex items-center gap-4 py-2 border-b border-border text-[12.5px]"
                                >
                                    <div className={`flex-1 ${r.pending ? 'text-text-3' : 'text-text-2'}`}>
                                        {r.l}
                                        {r.pending && (
                                            <span className="ml-2 text-[10px] uppercase tracking-wider text-text-3">
                                                not yet active
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-1.5 items-center shrink-0">
                                        {r.keys.map((k, j) => (
                                            <span key={j} className="flex items-center gap-1.5">
                                                {j > 0 && <span className="text-text-3 text-[10px]">+</span>}
                                                <span className="kbd">{k}</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
