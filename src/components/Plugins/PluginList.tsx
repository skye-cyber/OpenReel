import { useMemo, useState } from "react";
import Icon from "../../lib/Icons";
import { Button } from "../Button";
import { usePlayer } from "../../hooks/player";
import { IconButton } from "../Button";
import { Field } from "../Field";
import { PluginRow } from "./Row";
import { EmptyState } from "./Empty";
import { Available } from "./Available";

type Filter = 'all' | 'enabled' | 'disabled' | 'attention';

const FILTERS: ReadonlyArray<{ id: Filter; l: string }> = [
    { id: 'all', l: 'All' },
    { id: 'enabled', l: 'Enabled' },
    { id: 'disabled', l: 'Disabled' },
    { id: 'attention', l: 'Needs attention' },
];

export function PluginsList() {
    const { plugins, setModal, setPluginEnabled, selectPlugin, settings, setSetting, setSettingCat, setView } = usePlayer();
    const [q, setQ] = useState('');
    const [filter, setFilter] = useState<Filter>('all');

    const installed = useMemo(() => {
        const query = q.trim().toLowerCase();
        return plugins.filter(p => {
            if (query && !p.n.toLowerCase().includes(query)) return false;

            switch (filter) {
                case 'enabled':
                    return p.st === 'ok' && p.on;

                case 'disabled':
                    // "Disabled" means: not currently running AND not blocked by
                    // a problem the user hasn't addressed. A failed or conflicting
                    // plugin that's turned off is still "needs attention" — the
                    // user has an outstanding decision — so it doesn't belong here.
                    return !p.on && p.st === 'ok';

                case 'attention':
                    // Anything the user needs to act on: a conflict, a load
                    // failure, an incompatible package, or a plugin that reports
                    // OK but is somehow off when the user expected it on.
                    // (The last case doesn't occur in the current data, but the
                    // predicate is written so it stays true if it ever does.)
                    return p.st === 'conflict' || p.st === 'failed' || p.st === 'incompat';

                case 'all':
                default:
                    return true;
            }
        });
    }, [plugins, q, filter]);

    const counts = useMemo(() => ({
        all: plugins.length,
        enabled: plugins.filter(p => p.st === 'ok' && p.on).length,
        disabled: plugins.filter(p => !p.on && p.st === 'ok').length,
        attention: plugins.filter(p => p.st !== 'ok').length,
    }), [plugins]);

    if (!settings.pluginsEnabled) {
        return (
            <div className="p-6.5 px-8 pb-10 max-w-[720px]">
                <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">Plugins</h1>
                <p className="text-[12.5px] text-text-2 mb-5.5">
                    Optional extensions. OpenReel plays media without any of them.
                </p>

                <div className="flex items-start gap-3 p-[14px_16px] rounded-md text-[12.5px] leading-relaxed
            bg-surface-2 border border-border mb-4.5">
                    <Icon name="plug" size={16} className="text-text-3 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <div className="font-semibold mb-1">Plugins are turned off</div>
                        <div className="text-text-2">
                            No plugins are loaded or available to the player. Your installed plugins remain on disk
                            and will be available again when you turn this back on.
                        </div>
                    </div>
                    <Button size="sm" onClick={() => setSetting('pluginsEnabled', true)}>
                        Turn on plugins
                    </Button>
                </div>

                <div className="text-[11.5px] text-text-3">
                    Manage this setting in <button
                        onClick={() => {
                            setView('settings')
                            setSettingCat('plugins')
                        }}
                        className="text-accent hover:underline"
                    >Settings → Plugins</button>.
                </div>
            </div>
        );
    }
    return (
        <div className="p-6.5 px-8 pb-10 max-w-[1180px] h-[90%] overflow-y-auto">
            <h1 className="text-[19px] font-[650] tracking-[-.015em] mb-0.5">Plugins</h1>
            <p className="text-[12.5px] text-text-2 mb-5.5">
                Optional extensions. OpenReel plays media without any of them.
            </p>

            <div className="flex items-center gap-3 p-[11px_16px] rounded-md text-[12.5px] mb-4.5 bg-warning-dim border border-[rgba(217,161,59,.28)]">
                <Icon name="warn" size={16} className="text-warning" />
                <div className="flex-1">
                    <b>Safe mode was used on the last start.</b>{' '}
                    <span className="text-text-2">Plugins are currently disabled.</span>
                </div>
                <Button size="sm">Manage plugins</Button>
                <Button size="sm">Restart normally</Button>
            </div>

            <div className="flex items-center gap-2.5 mb-4.5 flex-wrap">
                <Field
                    icon="search"
                    placeholder="Search plugins…"
                    value={q}
                    onValue={setQ}
                    style={{ maxWidth: 260, flex: '0 1 260px' }}
                />

                {FILTERS.map(f => {
                    const active = filter === f.id;
                    const count = counts[f.id];
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            aria-pressed={active}
                            className={`h-7 px-3 rounded-[20px] border text-[12px] transition-all
                            ${active
                                    ? 'bg-accent-dim border-transparent text-accent font-semibold'
                                    : 'bg-surface border-border-2 text-text-2 hover:border-border-3 hover:text-text'}`}
                        >
                            {f.l}
                            <span className={`ml-1.5 tabular-nums ${active ? 'text-accent/70' : 'text-text-3'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}

                <div className="flex-1" />
                <Button size="sm" icon="download" onClick={() => setModal('install')}>
                    Install from file…
                </Button>
                <IconButton icon="chevDown" title="More" />
            </div>

            <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2.5">
                Installed · {installed.length}
            </div>

            {installed.length === 0 ? (
                <EmptyState query={q} filter={filter} />
            ) : (
                installed.map(p => (
                    <PluginRow
                        key={p.id}
                        plugin={p}
                        onToggle={() => setPluginEnabled(p.id, !p.on)}
                        onDetails={() => selectPlugin(p.id)}
                    />
                ))
            )}

            <div className="mt-5.5">
                <Available query={q} />
            </div>
        </div>
    );
}

