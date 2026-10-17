import { useEffect, useState } from 'react';
import Icon from '../../lib/Icons';
import { Button } from '../Button';
import { usePlayer } from '../../hooks/player';
import { PLUGIN_PERMISSIONS } from '../../lib/Permission';
import type { AvailableEntry } from '../../types/plugins';

interface Props {
    entry: AvailableEntry;
    onClose: () => void;
}

export function RepositoryInstallModal({ entry, onClose }: Props) {
    const {
        installFromRepository, pushEscapeHandler, popEscapeHandler,
    } = usePlayer();
    const [ack, setAck] = useState(entry.signed);

    useEffect(() => {
        pushEscapeHandler('repository-install', onClose);
        return () => popEscapeHandler('repository-install');
    }, [onClose, pushEscapeHandler, popEscapeHandler]);

    const handleInstall = () => {
        installFromRepository(entry);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-[rgba(6,7,9,.68)] backdrop-brightness-[0.5] animate-fade-in"
            onMouseDown={onClose}
        >
            <div
                className="w-full max-w-[466px] bg-surface border border-border-2 rounded-xl shadow-lg overflow-hidden animate-modal-in"
                onMouseDown={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="repo-install-title"
            >
                {/* ----- Header ----- */}
                <div className="px-[22px] pt-[18px]">
                    <h3
                        id="repo-install-title"
                        className="text-[15.5px] font-[650] tracking-[-.01em] mb-1"
                    >
                        Install “{entry.name}”?
                    </h3>
                    <p className="text-[12px] text-text-3 m-0">
                        {entry.provider} · version {entry.version} · from {entry.repositoryLabel}
                    </p>
                </div>

                {/* ----- Body ----- */}
                <div className="p-[18px_22px]">
                    <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2">
                        This plugin will be able to
                    </div>

                    <div className="bg-surface border border-border rounded-lg overflow-hidden mb-4">
                        {entry.permissions.length === 0 ? (
                            <div className="px-3.5 py-3 text-[12px] text-text-3">
                                This plugin has not declared any permissions.
                            </div>
                        ) : (
                            entry.permissions.map((pid, i, arr) => {
                                const perm = PLUGIN_PERMISSIONS[pid];
                                return (
                                    <div
                                        key={pid}
                                        className={`flex items-center gap-3 px-3 py-2.5 text-[12.5px]
                                        ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
                                    >
                                        <Icon
                                            name={
                                                pid === 'network' ? 'external'
                                                    : pid === 'read-media' ? 'eye'
                                                        : pid === 'write-config' ? 'layers'
                                                            : pid === 'spawn' ? 'zap'
                                                                : pid === 'audio-output' ? 'music'
                                                                    : 'film'
                                            }
                                            size={15}
                                            className="text-text-3 shrink-0"
                                        />
                                        <div className="flex-1">{perm.grant}</div>
                                        <span
                                            className={`chip-base ${perm.risk === 'High'
                                                ? 'text-warning bg-warning-dim border-transparent'
                                                : ''}`}
                                            style={{ height: 18, fontSize: 10 }}
                                        >
                                            {perm.risk}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {!entry.signed && (
                        <div className="rounded-md p-2.5 px-3.5 text-[12px] leading-relaxed bg-warning-dim border border-[rgba(217,161,59,.3)] text-text">
                            <b className="inline-flex items-center gap-1">
                                <Icon name="warn" size={12} /> Not signed.
                            </b>{' '}
                            OpenReel can't verify who published this.
                            <div className="flex items-center gap-2.5 mt-2.5">
                                <input
                                    type="checkbox"
                                    id="repo-ack"
                                    checked={ack}
                                    onChange={e => setAck(e.target.checked)}
                                    className="w-3.5 h-3.5 accent-accent"
                                />
                                <label htmlFor="repo-ack" className="text-[12px] text-text-2 cursor-pointer">
                                    I understand this package is unsigned
                                </label>
                            </div>
                        </div>
                    )}

                    {entry.signed && (
                        <div className="flex items-center gap-2 text-[11.5px] text-text-3">
                            <Icon name="shield" size={13} className="text-success" />
                            Signature verified by {entry.repositoryLabel}
                        </div>
                    )}
                </div>

                {/* ----- Footer ----- */}
                <div className="flex gap-2.5 justify-end p-3.5 px-[22px] bg-surface-2 border-t border-border">
                    <Button onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleInstall} disabled={!ack}>
                        {entry.signed ? 'Install' : 'Install anyway'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
