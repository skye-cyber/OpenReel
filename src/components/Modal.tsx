import { useState, useRef, useEffect } from "react";
import { usePlayer } from "../state/PlayerContext";
import type { ReactNode } from "react";
import Icon from "../lib/Icons";
import { Chip } from "./Chip";
import { Button } from "./Button";
import { useFocusTrap } from "../lib/useFocus";
import type { IconName } from "../types";

interface ModalProps {
    onClose: () => void;
    children: ReactNode;
}


export function Modal({ onClose, children }: ModalProps) {
    const p = usePlayer()
    const ref = useRef<HTMLDivElement>(null);
    useFocusTrap(ref, true);

    useEffect(() => {
        p.pushEscapeHandler('modal', onClose);
        return () => p.popEscapeHandler('modal');
    }, [p, onClose]);

    return (
        <div
            className="fixed inset-0 bg-[rgba(6,7,9,.68)] z-500 flex items-center justify-center p-6 animate-fade-in backdrop-brightness-[3px]
        light:bg-[rgba(30,34,40,.35)]"
            onMouseDown={onClose}
        >
            <div
                className="w-full max-w-[466px] bg-surface border border-border-2 rounded-xl shadow-lg overflow-hidden animate-modal-in"
                onMouseDown={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {children}
            </div>
        </div>
    );
}

export function ModalRoot() {
    const { modal, setModal, toast } = usePlayer();
    if (modal !== 'install') return null;
    return (
        <>
            <InstallModal
                onClose={() => setModal(null)}
                onInstall={() => { setModal(null); toast('Subtitle Finder installed'); }}
            />
            <UninstallModal />
        </>
    );
}

interface InstallModalProps { onClose: () => void; onInstall: () => void }

function InstallModal({ onClose, onInstall }: InstallModalProps) {
    const [ack, setAck] = useState(false);
    const { settings, toast } = usePlayer();

    const permissions: ReadonlyArray<{ icon: IconName; label: string; risk: 'High' | 'Medium' | 'Low' }> = [
        { icon: 'external', label: 'Connect to the internet', risk: 'High' },
        { icon: 'eye', label: 'Read the media files you open', risk: 'Medium' },
        { icon: 'layers', label: 'Store its own settings', risk: 'Low' },
    ];

    const handleInstall = () => {
        if (!settings.pluginsEnabled) {
            toast('Plugins are turned off — enable them first', 'err');
            return;
        }
        onInstall()
    };

    return (
        <Modal onClose={onClose}>
            <div className="px-[22px] pt-[18px]">
                <h3 className="text-[15.5px] font-[650] tracking-[-.01em] mb-1">Install "Subtitle Finder"?</h3>
                <p className="text-[12px] text-text-3 m-0">OpenReel Community · version 2.1.0 · repository plugins.example.org</p>
            </div>

            <div className="p-[18px_22px]">
                <div className="text-[10px] font-bold tracking-[.09em] uppercase text-text-3 mb-2">
                    This plugin will be able to
                </div>
                <div className="bg-surface border border-border rounded-lg overflow-hidden mb-4">
                    {permissions.map((p, i) => (
                        <div
                            key={p.label}
                            className={`flex items-center gap-2.5 px-3 py-2.5 text-[12.5px]
                ${i < permissions.length - 1 ? 'border-b border-border' : ''}`}
                        >
                            <Icon name={p.icon} size={15} className="text-text-3" />
                            <div className="flex-1">{p.label}</div>
                            <Chip tone={p.risk === 'High' ? 'warn' : undefined} style={{ height: 18, fontSize: 10 }}>
                                {p.risk}
                            </Chip>
                        </div>
                    ))}
                </div>

                <div className="rounded-md p-2.5 px-3.5 text-[12px] leading-relaxed bg-warning-dim border border-[rgba(217,161,59,.3)] text-text">
                    <b className="inline-flex items-center gap-1">
                        <Icon name="warn" size={12} /> Not signed.
                    </b>{' '}
                    OpenReel can't verify who published this.
                    <div className="flex items-center gap-2.5 mt-2.5">
                        <input
                            data-search-field
                            type="checkbox"
                            id="ack"
                            checked={ack}
                            onChange={e => setAck(e.target.checked)}
                            className="w-3.5 h-3.5 accent-accent"
                        />
                        <label htmlFor="ack" className="text-[12px] text-text-2 cursor-pointer">
                            I understand this package is unsigned
                        </label>
                    </div>
                </div>

                <div className="mt-3.5 text-[11.5px] text-text-3">
                    ▸ Technical details — API 1.4 · 412 KB · sha256 9c2f…a71b
                </div>
            </div>

            <div className="flex gap-2.5 justify-end p-3.5 px-[22px] bg-surface-2 border-t border-border">
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleInstall} disabled={!ack}>Install anyway</Button>
            </div>
        </Modal>
    );
}


export function UninstallModal() {
    const { plugins, confirmUninstallId, setConfirmUninstallId, uninstallPlugin, toast } = usePlayer();
    const plugin = plugins.find(p => p.id === confirmUninstallId);
    const [removeData, setRemoveData] = useState(true);

    if (!plugin) return null;

    const handleConfirm = () => {
        uninstallPlugin(plugin.id);
        toast(`Uninstalled ${plugin.n}`);
    };

    return (
        <Modal onClose={() => setConfirmUninstallId(null)}>
            <div className="px-[22px] pt-[18px]">
                <h3 className="text-[15.5px] font-[650] tracking-[-.01em] mb-1">
                    Uninstall “{plugin.n}”?
                </h3>
                <p className="text-[12px] text-text-3 m-0">
                    {plugin.p} · version {plugin.v}
                </p>
            </div>

            <div className="p-[18px_22px]">
                {plugin.installPath && (
                    <div className="rounded-md p-[12px_14px] bg-surface-2 border border-border mb-4
            text-[12px] leading-relaxed text-text-2">
                        Files will be moved to the system trash from{' '}
                        <code className="font-mono text-[11.5px] text-text">{plugin.installPath}</code>
                        {plugin.size && <> ({plugin.size})</>}.
                    </div>
                )}

                <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={removeData}
                        onChange={e => setRemoveData(e.target.checked)}
                        className="w-3.5 h-3.5 mt-0.5 accent-accent"
                    />
                    <span className="text-[12px] text-text-2 leading-relaxed">
                        Also remove this plugin's settings and cached data
                    </span>
                </label>
            </div>

            <div className="flex gap-2.5 justify-end p-3.5 px-[22px] bg-surface-2 border-t border-border">
                <Button onClick={() => setConfirmUninstallId(null)}>Cancel</Button>
                <Button variant="primary" onClick={handleConfirm}>Uninstall</Button>
            </div>
        </Modal>
    );
}
