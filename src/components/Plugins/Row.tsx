import type { Plugin } from "../../types";
import Icon from "../../lib/Icons";
import { Chip } from "../Chip";
import { Switch } from "../Switch";
import { IconButton } from "../Button";
import { Button } from "../Button";
import type { AvailableEntry } from "../../types/plugins";


export function PluginRow({
    plugin: p, onToggle, onDetails,
}: { plugin: Plugin; onToggle: () => void; onDetails: () => void }) {
    const borderCls =
        p.st === 'failed' ? 'border-[rgba(224,100,92,.3)] bg-danger-dim'
            : p.st === 'conflict' ? 'border-[rgba(217,161,59,.3)] bg-warning-dim'
                : 'border-border bg-surface';

    return (
        <>
            <div className={`pl-row flex items-center gap-3.5 p-[13px_16px] rounded-md border mb-2
                        transition-[border-color,background] hover:border-border-2 ${borderCls}`}>
                <div className="w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center
                        text-text-2 shrink-0">
                    <Icon name="plug" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-[620] flex items-center gap-2.5 flex-wrap">
                        {p.n}
                        <Chip style={{ height: 18, fontSize: 10 }}>{p.c}</Chip>
                        {p.st === 'ok' && p.on && <Chip tone="ok" style={{ height: 18, fontSize: 10 }}>Enabled</Chip>}
                        {p.st === 'ok' && !p.on && <Chip style={{ height: 18, fontSize: 10 }}>Disabled</Chip>}
                        {p.st === 'conflict' && <Chip tone="warn" icon="warn" style={{ height: 18, fontSize: 10 }}>Conflict</Chip>}
                        {p.st === 'failed' && <Chip tone="err" icon="alert" style={{ height: 18, fontSize: 10 }}>Failed</Chip>}
                        {p.st === 'incompat' && <Chip tone="warn" style={{ height: 18, fontSize: 10 }}>Incompatible</Chip>}
                    </div>
                    <div className="text-[11.5px] text-text-3 mt-0.5 truncate">
                        {p.p} · v{p.v} · {p.d}
                    </div>
                </div>
                <Switch on={p.on} onChange={onToggle} label={`Enable ${p.n}`} />
                <IconButton icon="chevRight" size={15} title="Details" onClick={onDetails} />
            </div>

            {p.st === 'conflict' && (
                <div className="rounded-md p-[10px_14px] text-[12px] leading-relaxed -mt-0.5 mb-2.5
                        bg-warning-dim border border-[rgba(217,161,59,.3)] text-text">
                    <b>Conflict:</b> two plugins provide the same hook. Only one can be active.
                    <div className="flex gap-3.5 mt-1.5 flex-wrap">
                        <button onClick={onDetails} className="text-accent border-b border-accent-dim">
                            Resolve in plugin details →
                        </button>
                    </div>
                </div>
            )}

            {p.st === 'failed' && (
                <div className="rounded-md p-[10px_14px] text-[12px] leading-relaxed -mt-0.5 mb-2.5
                        bg-danger-dim border border-[rgba(224,100,92,.3)] text-text">
                    Failed to load — <em>{p.err}</em>
                    <div className="flex gap-3.5 mt-1.5 flex-wrap">
                        <button onClick={onDetails} className="text-accent border-b border-accent-dim">View details →</button>
                    </div>
                </div>
            )}

            {p.st === 'incompat' && (
                <div className="rounded-md p-[10px_14px] text-[12px] leading-relaxed -mt-0.5 mb-2.5
                        bg-surface-2 border border-border text-text-2">
                    {p.err} — this plugin can't be enabled on this build.
                </div>
            )}
        </>
    );
}

export function AvailableRow({
    entry, onInstall,
}: { entry: AvailableEntry; onInstall: () => void }) {
    const incompatible = !entry.compatibility.ok;

    return (
        <div className={`flex items-center gap-3.5 p-[13px_16px] rounded-md border mb-2
            transition-[border-color,background] hover:border-border-2
            ${entry.installed
                ? 'bg-surface border-border'
                : incompatible
                    ? 'bg-surface-2 border-border'
                    : 'bg-surface border-border'}`}>
            <div className="w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-2 shrink-0">
                <Icon name="download" size={16} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-[620] flex items-center gap-2.5 flex-wrap">
                    {entry.name}
                    <span className="chip-base" style={{ height: 18, fontSize: 10 }}>{entry.category}</span>
                    {entry.installed && (
                        <span className="chip-base text-success border-transparent bg-success-dim"
                            style={{ height: 18, fontSize: 10 }}>
                            Installed{entry.installedVersion ? ` · v${entry.installedVersion}` : ''}
                        </span>
                    )}
                    {!entry.installed && incompatible && (
                        <span className="chip-base text-warning border-transparent bg-warning-dim"
                            style={{ height: 18, fontSize: 10 }}>
                            Incompatible
                        </span>
                    )}
                    {!entry.signed && !entry.installed && (
                        <span className="chip-base text-warning border-transparent bg-warning-dim"
                            style={{ height: 18, fontSize: 10 }}>
                            Not signed
                        </span>
                    )}
                </div>
                <div className="text-[11.5px] text-text-3 mt-0.5 truncate">
                    {entry.provider} · v{entry.version} · {entry.description}
                </div>
                {incompatible && entry.compatibility.reason && (
                    <div className="text-[11px] text-warning mt-1">{entry.compatibility.reason}</div>
                )}
            </div>
            <div className="shrink-0">
                {entry.installed ? (
                    <Button size="sm" disabled>Installed</Button>
                ) : incompatible ? (
                    <Button size="sm" disabled>Can't install</Button>
                ) : (
                    <Button size="sm" variant="primary" onClick={onInstall}>
                        Install
                    </Button>
                )}
            </div>
        </div>
    );
}
