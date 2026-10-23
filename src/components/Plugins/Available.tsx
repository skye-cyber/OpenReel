import { useEffect, useMemo, useState } from 'react';
import Icon from '../../lib/Icons';
import { Button, IconButton } from '../Button';
import { usePlayer } from '../../hooks/player';
import {
    getKnownRepositories,
} from '../../lib/platform/plugins';
import type { AvailableEntry, Repository } from '../../types/plugins';
import { RepositoryInstallModal } from './RepositoryInstall';
import { AvailableRow } from './Row';

interface AvailableProps {
    query: string;
}

export function Available({ query }: AvailableProps) {
    const {
        repositories, availableEntries, repositoriesLoading, repositoryError,
        addRepository, removeRepository, refreshRepositories,
    } = usePlayer();

    const [pendingInstall, setPendingInstall] = useState<AvailableEntry | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [knownChoices, setKnownChoices] = useState<Repository[]>([]);

    useEffect(() => {
        void getKnownRepositories().then(setKnownChoices);
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return availableEntries;
        return availableEntries.filter(
            e => e.name.toLowerCase().includes(q) ||
                e.provider.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q),
        );
    }, [availableEntries, query]);

    const unusedChoices = knownChoices.filter(
        c => !repositories.some(r => r.id === c.id),
    );

    /* ---------- No repositories yet ---------- */
    if (repositories.length === 0) {
        return (
            <div>
                <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2.5">
                    Available
                </div>
                <div className="rounded-md p-[14px_16px] bg-surface-2 border border-border">
                    <div className="flex items-start gap-3">
                        <Icon name="external" size={16} className="text-text-3 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <div className="text-[12.5px] font-semibold mb-1">No repositories configured</div>
                            <div className="text-[11.5px] text-text-3 leading-relaxed mb-3">
                                Plugin repositories list plugins you can install. Adding one lets you browse
                                and install from it. You can remove a repository at any time.
                            </div>
                            {unusedChoices.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {unusedChoices.map(choice => (
                                        <Button
                                            key={choice.id}
                                            size="sm"
                                            icon="plus"
                                            onClick={() => addRepository(choice)}
                                        >
                                            Add {choice.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ---------- Repositories present ---------- */
    return (
        <div className='relative'>
            <div className="flex items-center justify-between mb-2.5">
                <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3">
                    Available · {filtered.length} {filtered.length === 1 ? 'plugin' : 'plugins'}
                </div>
                <div className="flex items-center gap-1.5">
                    <IconButton
                        icon="refresh"
                        size={13}
                        title="Refresh repositories"
                        onClick={() => void refreshRepositories()}
                        disabled={repositoriesLoading}
                    />
                    <div className="relative">
                        <button
                            onClick={() => setShowAddMenu(!showAddMenu)}
                            className="text-[11px] text-text-2 hover:text-text px-2 py-0.5 rounded-sm hover:bg-hover"
                        >
                            Sources ({repositories.length})
                        </button>
                        {showAddMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-[199]"
                                    onClick={() => setShowAddMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 min-w-[240px] bg-surface
                                border border-border-2 rounded-lg shadow-lg p-1 z-[200] animate-menu-in">
                                    {repositories.map(repo => (
                                        <div
                                            key={repo.id}
                                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm hover:bg-hover"
                                        >
                                            <Icon name="external" size={12} className="text-text-3 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] text-text truncate">{repo.label}</div>
                                                <div className="text-[10px] text-text-3 truncate font-mono">{repo.url}</div>
                                            </div>
                                            <button
                                                onClick={() => { removeRepository(repo.id); setShowAddMenu(false); }}
                                                className="text-[10.5px] text-text-3 hover:text-danger"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                    {unusedChoices.length > 0 && (
                                        <>
                                            <div className="h-px bg-border my-1 mx-2" />
                                            {unusedChoices.map(choice => (
                                                <button
                                                    key={choice.id}
                                                    onClick={() => { addRepository(choice); setShowAddMenu(false); }}
                                                    className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-sm
                                     text-[12px] text-text text-left hover:bg-hover"
                                                >
                                                    <Icon name="plus" size={12} className="text-text-3 shrink-0" />
                                                    Add {choice.label}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {repositoryError && (
                <div className="mb-3 rounded-md p-2.5 px-3.5 bg-warning-dim border border-[rgba(217,161,59,.3)]
                        text-[11.5px] text-text leading-relaxed">
                    <Icon name="warn" size={12} className="inline -mt-0.5 mr-1.5" />
                    {repositoryError}
                </div>
            )}

            {repositoriesLoading ? (
                <div className="py-8 text-center">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-border-2 border-t-accent
                           animate-spin-slow mr-2 align-middle" />
                    <span className="text-[12px] text-text-3">Fetching from {repositories.length} repositories…</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="py-8 text-center text-[12px] text-text-3">
                    {query ? <>No available plugins match “{query}”.</> : 'No plugins available from configured repositories.'}
                </div>
            ) : (
                filtered.map(entry => (
                    <AvailableRow
                        key={entry.id}
                        entry={entry}
                        onInstall={() => setPendingInstall(entry)}
                    />
                ))
            )}

            {pendingInstall && (
                <RepositoryInstallModal
                    entry={pendingInstall}
                    onClose={() => setPendingInstall(null)}
                />
            )}
        </div>
    );
}

