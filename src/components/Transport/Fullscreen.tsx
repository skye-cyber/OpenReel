import Icon from '../../lib/Icons';
import { usePlayer } from "../../hooks/player";
import { Bar } from './Bar';
import { fmt } from '../../lib/format';
import { useCallback, useEffect, useRef } from 'react';

/* ============================================================
 *  Timing constants
 *  ============================================================ */
const IDLE_TIMEOUT_MS = 3000;      // hide the transport after this long without activity
const REVEAL_ZONE_PX = 80;        // bottom strip that always reveals the transport
const REVEAL_ZONE_PCT = 0.001;      // or 20% of the viewport height, whichever is larger

export interface FullscreenProps {
    visible: boolean;
    setVisible: (v: boolean) => void;
}

export function FullscreenTransport({ visible, setVisible }: FullscreenProps) {
    const p = usePlayer();
    const dur = p.media?.dur ?? 0;

    /* ---------- Visibility state ---------- */
    //     const [visible, setVisible] = useState(true);

    /* Refs so effects can read current values without re-running. */
    const timeoutRef = useRef<number | null>(null);
    const pointerInRevealZoneRef = useRef(false);

    /* Reset the idle timer — called on any activity. */
    const resetIdleTimer = useCallback(() => {
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (!pointerInRevealZoneRef.current) {
            timeoutRef.current = window.setTimeout(() => {
                setVisible(false);
                timeoutRef.current = null;
            }, IDLE_TIMEOUT_MS);
        }
    }, []);

    /* Show the transport and restart the timer. */
    const showTransport = useCallback(() => {
        setVisible(true);
        resetIdleTimer();
    }, [resetIdleTimer]);

    /* ---------- Mount: attach listeners ---------- */
    useEffect(() => {
        const stage = document.getElementById('openreel-stage');
        if (!stage) return;

        const isInRevealZone = (clientY: number): boolean => {
            const rect = stage.getBoundingClientRect();
            const zonePx = Math.max(REVEAL_ZONE_PX, rect.height * REVEAL_ZONE_PCT);
            return clientY >= rect.bottom - zonePx;
        };

        const onMouseMove = (e: MouseEvent) => {
            const inZone = isInRevealZone(e.clientY);
            pointerInRevealZoneRef.current = inZone;
            showTransport();
        };

        const onMouseDown = () => showTransport();

        const onKey = () => showTransport();

        const onTouchStart = () => showTransport();

        /* When the pointer leaves the window entirely, keep current visibility
         *      but stop the timer (we don't want to hide while the pointer is out
         *      and then have it stuck hidden). */
        const onMouseLeave = () => {
            pointerInRevealZoneRef.current = false;
        };

        stage.addEventListener('mousemove', onMouseMove);
        stage.addEventListener('mousedown', onMouseDown);
        stage.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('keydown', onKey);
        document.addEventListener('mouseleave', onMouseLeave);

        /* Start the initial timer. */
        resetIdleTimer();

        return () => {
            stage.removeEventListener('mousemove', onMouseMove);
            stage.removeEventListener('mousedown', onMouseDown);
            stage.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mouseleave', onMouseLeave);
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [resetIdleTimer, showTransport]);

    /* ---------- Hide the cursor when transport is hidden ---------- */
    useEffect(() => {
        const stage = document.getElementById('openreel-stage');
        if (!stage) return;
        stage.style.cursor = visible ? '' : 'none';
        return () => {
            stage.style.cursor = '';
        };
    }, [visible]);

    /* ---------- Render ---------- */
    return (
        <div
            className={`absolute left-0 right-0 bottom-0 z-10 px-5 py-4 flex flex-col gap-3
            bg-gradient-to-t from-gray-900/40 to-transparent
            transition-opacity duration-1000
            ${p.playing ? (visible ? 'opacity-100' : 'opacity-0 pointer-events-none') : ''}`}
            aria-hidden={!visible}
            onMouseEnter={showTransport}
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
