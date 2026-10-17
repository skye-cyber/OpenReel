import { usePlayer } from "../hooks/player";
import Icon from "../lib/Icons";

export function StatusStrip() {
    const { buffering, offline, settings, scan, cancelScan } = usePlayer();

    if (!settings.showStatusStrip) return null;

    const scanning = scan?.inProgress ?? false;
    if (!buffering && !offline && !scanning) return null;

    return (
        <div className="shrink-0 flex items-center gap-2.5 h-[30px] px-[18px] bg-surface-2 border-t border-border
        text-[11.5px] text-text-2">
            {scanning && scan && (
                <>
                    <span className="w-3 h-3 rounded-full border-2 border-border-2 border-t-accent animate-spin-slow" />
                    <span>
                        Scanning {scan.currentFolder} · {scan.itemsFound.toLocaleString()}
                        {scan.itemsExpected ? ` of ${scan.itemsExpected.toLocaleString()}` : ''} items
                    </span>
                </>
            )}
            {buffering && (
                <>
                    <span className="w-3 h-3 rounded-full border-2 border-border-2 border-t-accent animate-spin-slow" />
                    <span>Buffering lecture-04.mkv · 42%</span>
                </>
            )}
            {offline && (
                <>
                    <Icon name="wifiOff" size={13} className="text-warning" />
                    <span>Reconnecting — attempt 2 of 5</span>
                </>
            )}
            <div className="flex-1" />
            {scanning ? (
                <button
                    onClick={cancelScan}
                    className="btn-base btn-hover h-[22px] px-2.5 text-[11px]"
                >
                    Stop
                </button>
            ) : (
                <button className="btn-base btn-hover h-[22px] px-2.5 text-[11px]">Cancel</button>
            )}
        </div>
    );
}
