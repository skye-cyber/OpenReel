import { useEffect, useState } from 'react';
import Icon from '../lib/Icons';
import { Button } from './Button';
import { usePlayer } from '../hooks/player';


export function CrashRecoveryModal() {
    const {
        safeMode, safeModeReason, exitSafeModeAndReload, setView,
        pushEscapeHandler, popEscapeHandler,
    } = usePlayer();

    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!safeMode || safeModeReason !== 'crash' || dismissed) return;
        //         if (!safeMode || dismissed) return;
        pushEscapeHandler('crash-recovery', () => setDismissed(true));
        return () => popEscapeHandler('crash-recovery');
    }, [safeMode, safeModeReason, dismissed, pushEscapeHandler, popEscapeHandler]);

    if (!safeMode || safeModeReason !== 'crash' || dismissed) return null;
    //     if (!safeMode || dismissed) return;

    const handleStartNormally = () => {
        setDismissed(true);
        // Do not clear safe mode here — the user may still want to
        // investigate. "Enable one at a time" clears it explicitly.
        setView('plugins');
    };

    const handleEnableOneAtATime = () => {
        setDismissed(true);
        exitSafeModeAndReload();
        // On reload, pluginsEnabled is true but the trial-mode flag
        // can be checked in the plugin list to disable auto-enable.
        // For simplicity in this build, this just clears safe mode.
    };

    const handleViewLog = () => {
        setDismissed(true);
        setView('about');
    };

    return (
        <div
            className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-[rgba(6,7,9,.68)] backdrop-brightness-[0.5] animate-fade-in"
            onMouseDown={() => setDismissed(true)}
        >
            <div
                className="w-full max-w-[466px] bg-surface border border-border-2 rounded-xl shadow-lg overflow-hidden animate-modal-in"
                onMouseDown={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="crash-recovery-title"
            >
                <div className="px-[22px] pt-[18px] pb-4 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-warning-dim border border-border-2 flex items-center justify-center text-warning shrink-0">
                        <Icon name="warn" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 id="crash-recovery-title" className="text-[15.5px] font-[650] tracking-[-.01em] mb-1">
                            OpenReel closed unexpectedly
                        </h3>
                        <p className="text-[12px] text-text-3 m-0 leading-relaxed">
                            OpenReel crashed twice in quick succession. It started with plugins
                            disabled to prevent another crash.
                        </p>
                    </div>
                </div>

                <div className="px-[22px] pb-4">
                    <div className="rounded-md p-3 bg-surface-2 border border-border text-[12px] leading-relaxed text-text-2">
                        Playback works normally. Plugins remain installed and can be
                        enabled again once you've identified the cause.
                    </div>
                </div>

                <div className="flex gap-2 flex-col px-[22px] pb-4">
                    <Button variant="primary" onClick={handleStartNormally}>
                        Keep plugins disabled
                    </Button>
                    <Button onClick={handleEnableOneAtATime}>
                        Enable plugins one at a time
                    </Button>
                    <Button variant="ghost" onClick={handleViewLog}>
                        View log
                    </Button>
                </div>

                <div className="px-[22px] py-2.5 bg-surface-2 border-t border-border text-[10.5px] text-text-3 leading-snug">
                    Plugins stay disabled until you restart normally.
                </div>
            </div>
        </div>
    );
}
