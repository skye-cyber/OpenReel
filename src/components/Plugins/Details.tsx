import { useEffect } from "react";
import { usePlayer } from "../../hooks/player";
import { Button } from "../Button";
import { Row2 } from "./shared";
import { StatusChip, permissionIcon } from "./shared";
import Icon from "../../lib/Icons";
import { Chip } from "../Chip";
import { ConflictPanel } from "./Conflict";
import { SectionTitle } from "./shared";
import { PLUGIN_PERMISSIONS } from "../../lib/Permission";
import { openExternal } from "../../lib/platform/shell";

export function PluginDetail({ id }: { id: string }) {
    const {
        plugins, selectPlugin, setPluginEnabled, setConfirmUninstallId, pushEscapeHandler, popEscapeHandler, resolveConflict,
    } = usePlayer();

    const plugin = plugins.find(p => p.id === id);

    useEffect(() => {
        // Escape from the detail view returns to the list.
        pushEscapeHandler('plugin-detail', () => selectPlugin(null));
        return () => popEscapeHandler('plugin-detail');
    }, [pushEscapeHandler, popEscapeHandler, selectPlugin]);

    if (!plugin) {
        // The plugin was uninstalled while we were looking at it.
        return (
            <div className="p-6.5 px-8 pb-10 max-w-[880px] select-none">
                <div className="py-16 text-center">
                    <div className="text-[12.5px] text-text-2 mb-3">This plugin is no longer installed.</div>
                    <Button size="sm" onClick={() => selectPlugin(null)}>Back to plugins</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6.5 px-8 pb-10 max-w-[880px] select-none">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <button
                    onClick={() => selectPlugin(null)}
                    className="flex items-center gap-1.5 text-[12px] text-text-2 hover:text-text"
                >
                    <Icon name="chevRight" size={14} className="rotate-180" />
                    Plugins
                </button>
            </div>

            <div className="flex items-start gap-4.5 mb-6">
                <div className="w-14 h-14 rounded-xl bg-surface-2 border border-border flex items-center justify-center
                        text-text-2 shrink-0">
                    <Icon name="plug" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-[680] tracking-[-.015em] mb-1 flex items-center gap-2.5 flex-wrap">
                        {plugin.name}
                        <StatusChip status={plugin.status} on={plugin.on} />
                    </div>
                    <div className="text-[12.5px] text-text-2 mb-2">
                        {plugin.provider} · v{plugin.version} {plugin.apiVersion && <>· API {plugin.apiVersion}</>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <Chip style={{ height: 20, fontSize: 10.5 }}>{plugin.category}</Chip>
                        {plugin.signed
                            ? <Chip tone="ok" style={{ height: 20, fontSize: 10.5 }}>Signed</Chip>
                            : <Chip tone="warn" icon="warn" style={{ height: 20, fontSize: 10.5 }}>Not signed</Chip>}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <Button
                    variant="primary"
                    size="sm"
                    disabled={plugin.status === 'incompat'}
                    onClick={() => setPluginEnabled(plugin.id, !plugin.on)}
                >
                    {plugin.on ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" icon="download">Check for updates</Button>
                <Button size="sm" onClick={() => setConfirmUninstallId(plugin.id)}>Uninstall…</Button>
                {plugin.homepage && (
                    <Button
                        size="sm"
                        icon="external"
                        onClick={() => plugin.homepage && void openExternal(plugin.homepage)}
                    >
                        Open homepage
                    </Button>
                )}
            </div>

            {/* Conflict resolution — only shown when there's a conflict to resolve */}
            {plugin.status === 'conflict' && (
                <ConflictPanel plugin={plugin} onResolve={resolveConflict} />
            )}

            {/* Failure notice — only shown when the plugin is in a failed state */}
            {plugin.status === 'failed' && plugin.err && (
                <div className="rounded-md p-[12px_14px] mb-6 bg-danger-dim border border-[rgba(224,100,92,.3)]
                        text-[12px] leading-relaxed text-text">
                    <b>Failed to load.</b> {plugin.err}
                    <div className="flex gap-3.5 mt-2 flex-wrap">
                        <button className="text-accent border-b border-accent-dim">View log</button>
                        <button className="text-accent border-b border-accent-dim">Retry</button>
                    </div>
                </div>
            )}

            {/* What it does */}
            {plugin.long && (
                <>
                    <SectionTitle>What it does</SectionTitle>
                    <p className="text-[12.5px] text-text-2 leading-relaxed mb-6 max-w-[70ch]">{plugin.long}</p>
                </>
            )}

            {/* Permissions */}
            <SectionTitle>Permissions</SectionTitle>
            <div className="bg-surface border border-border rounded-md overflow-hidden mb-6">
                {plugin.permissions && plugin.permissions.length > 0 ? (
                    plugin.permissions.map((pid, i, arr) => {
                        const perm = PLUGIN_PERMISSIONS[pid];
                        return (
                            <div
                                key={pid}
                                className={`flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]
                  ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
                            >
                                <Icon
                                    name={permissionIcon(pid)}
                                    size={15}
                                    className="text-text-3 shrink-0"
                                />
                                <div className="flex-1">{perm.held}</div>
                                <Chip
                                    tone={perm.risk === 'High' ? 'warn' : undefined}
                                    style={{ height: 18, fontSize: 10 }}
                                >
                                    {perm.risk}
                                </Chip>
                            </div>
                        );
                    })
                ) : (
                    <div className="px-3.5 py-3 text-[12px] text-text-3">
                        This plugin has not declared any permissions.
                    </div>
                )}
            </div>

            {/* Hooks */}
            {plugin.hooks && plugin.hooks.length > 0 && (
                <>
                    <SectionTitle>Provides</SectionTitle>
                    <div className="flex gap-2 flex-wrap mb-6">
                        {plugin.hooks.map(h => (
                            <code
                                key={h}
                                className="text-[11.5px] font-mono text-text-2 px-2 py-1 rounded-sm
                           bg-surface-2 border border-border"
                            >
                                {h}
                            </code>
                        ))}
                    </div>
                </>
            )}

            {/* Activity */}
            {plugin.activity && plugin.activity.length > 0 && (
                <>
                    <SectionTitle>Recent activity</SectionTitle>
                    <div className="bg-surface border border-border rounded-md overflow-hidden mb-6">
                        {plugin.activity.map((a, i, arr) => (
                            <div
                                key={i}
                                className={`flex items-start gap-3 px-3.5 py-2.5 text-[12px]
                  ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
                            >
                                <span className="text-[11px] text-text-3 font-mono tabular-nums pt-0.5 shrink-0">
                                    {a.at}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 pt-1 w-[42px] ${a.level === 'error' ? 'text-danger'
                                        : a.level === 'warn' ? 'text-warning'
                                            : 'text-success'
                                    }`}>
                                    {a.level}
                                </span>
                                <span className="text-[12px] text-text-2 leading-relaxed">{a.msg}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Technical */}
            <SectionTitle>Technical</SectionTitle>
            <dl className="grid grid-cols-[180px_1fr] m-0">
                {plugin.apiVersion && <Row2 label="Plugin API" value={plugin.apiVersion} />}
                {plugin.size && <Row2 label="Size on disk" value={plugin.size} />}
                {plugin.installPath && <Row2 label="Install path" value={plugin.installPath} mono />}
                <Row2 label="Signature" value={plugin.signed ? 'Verified' : 'Not signed'} />
            </dl>
        </div>
    );
}
