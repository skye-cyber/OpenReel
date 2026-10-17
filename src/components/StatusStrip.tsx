import Icon from "../lib/Icons";
import { usePlayer } from "../state/PlayerContext";

export function StatusStrip() {
    const { buffering, offline, settings } = usePlayer();

    if (!settings.showStatusStrip) return null;
    if (!buffering && !offline) return null;

    return (
        <div className="shrink-0 flex items-center gap-2.5 h-[30px] px-[18px] bg-surface-2 border-t border-border
        text-[11.5px] text-text-2">
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
            <button className="btn-base btn-hover h-[22px] px-2.5 text-[11px]">Cancel</button>
        </div>
    );
}
