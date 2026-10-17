import Icon from '../../lib/Icons';
import { usePlayer } from '../../state/PlayerContext';
import { Bar } from './Bar';
import { fmt } from '../../lib/format';

export function FullscreenTransport() {
    const p = usePlayer();
    const dur = p.media?.dur ?? 0;

    return (
        <div
            className="absolute left-0 right-0 bottom-0 z-10 px-5 py-4 flex flex-col gap-3
        bg-gradient-to-t from-[rgba(0,0,0,.85)] to-transparent
        transition-opacity"
        >
            <div className="flex items-center gap-3">
                <span className="text-[11.5px] text-white/80 font-[550] tabular-nums min-w-[42px]">
                    {fmt(p.pos * dur)}
                </span>
                <Bar value={p.pos} onChange={p.seekTo} buffered={p.buffered} />
                <span className="text-[11.5px] text-white/50 font-[550] tabular-nums min-w-[42px] text-right">
                    {fmt(dur)}
                </span>
            </div>

            <div className="flex items-center justify-center gap-1">
                <FscIcon icon="prev" onClick={p.prevItem} disabled={!p.hasMedia} title="Previous" />
                <FscIcon icon="back10" onClick={() => p.seekBy(-10)} disabled={!p.hasMedia} title="Back 10 seconds" />

                <button
                    type="button"
                    onClick={() => p.setPlayingAnnounced(!p.playing)}
                    aria-label={p.playing ? 'Pause' : 'Play'}
                    className="w-11 h-11 rounded-full bg-white/95 text-black flex items-center justify-center mx-2
        transition-transform hover:scale-105 active:scale-95"
                >
                    <Icon name={p.playing ? 'pause' : 'play'} size={20} />
                </button>

                <FscIcon icon="fwd10" onClick={() => p.seekBy(10)} disabled={!p.hasMedia} title="Forward 10 seconds" />
                <FscIcon icon="next" onClick={p.nextItem} disabled={!p.hasMedia} title="Next" />

                <div className="absolute right-5 flex items-center gap-1">
                    <FscIcon
                        icon={p.muted ? 'volMute' : 'vol'}
                        onClick={() => p.setMutedAnnounced(!p.muted)}
                        title={p.muted ? 'Unmute' : 'Mute'}
                    />
                    <FscIcon
                        icon="x"
                        onClick={p.toggleFullscreen}
                        title="Exit fullscreen"
                    />
                </div>
            </div>
        </div>
    );
}

function FscIcon({
    icon, onClick, disabled, title,
}: { icon: import('../../lib/Icons').IconName; onClick: () => void; disabled?: boolean; title: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/85
        transition-colors hover:bg-white/10 hover:text-white
        disabled:opacity-30 disabled:pointer-events-none"
        >
            <Icon name={icon} size={18} />
        </button>
    );
}
