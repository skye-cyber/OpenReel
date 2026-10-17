import { useEffect, useRef, useState } from 'react';
import type { VideoMedia } from '../types';
import { Button } from '../components/Button';
import { ContextMenu } from '../components/ContextMenu/Menu';
import { usePlayer } from "../hooks/player";
import Icon from '../lib/Icons';
import { fmt } from '../lib/format';
import { FullscreenTransport } from '../components/Transport/Fullscreen';
import type { ContextMenuEntry } from '../types/contextmenu';
import { useContextMenu } from '../hooks/useContextMenu';

export function VideoStage({ media }: { media: VideoMedia }) {
    const [visible, setVisible] = useState(true);

    const {
        playing, setPlayingAnnounced,
        pos, dur, buffering, offline,
        fullscreen, toggleFullscreen,
        pushEscapeHandler, popEscapeHandler,
        settings, setSetting, takeSnapshot,
        setAudioTrack, setSubTrack,
        toast, setMediaInfoOpen, mediaInfoOpen,
        registerVideoElement, updateMediaDuration,
        setPos, setBuffered, setBuffering, syncPlayingFromElement,
    } = usePlayer();

    const { state: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu<undefined>();
    const localRef = useRef<HTMLVideoElement | null>(null);

    /* Register the element with the context on mount. */
    useEffect(() => {
        registerVideoElement(localRef.current);
        return () => registerVideoElement(null);
    }, [registerVideoElement]);

    useEffect(() => {
        const v = localRef.current;
        if (!v) return;

        const onTimeUpdate = () => {
            if (Number.isFinite(v.duration) && v.duration > 0) {
                setPos(v.currentTime / v.duration);
            }
        };
        const onDurationChange = () => {
            if (Number.isFinite(v.duration) && v.duration > 0 && media.dur !== v.duration) {
                updateMediaDuration(v.duration);
            }
        };
        const onPlay = () => syncPlayingFromElement(true);
        const onPause = () => syncPlayingFromElement(false);
        const onWaiting = () => setBuffering(true);
        const onPlaying = () => setBuffering(false);
        const onCanPlay = () => setBuffering(false);
        const onProgress = () => {
            if (v.buffered.length > 0) {
                const end = v.buffered.end(v.buffered.length - 1);
                if (Number.isFinite(v.duration) && v.duration > 0) {
                    setBuffered(end / v.duration);
                }
            }
        };
        const onEnded = () => {
            syncPlayingFromElement(false);
            // Advance queue if autoplay is on, else reset to start.
            if (settings.autoplayNext) {
                // nextItem();
            } else {
                setPos(0);
                v.currentTime = 0;
            }
        };
        const onError = () => {
            // Route to error stage — the media is unplayable.
            // For the demo, just toast. Real routing depends on the error code.
            toast(`Couldn't load ${media.title}`, 'err');
        };
        const onVolumeChange = () => {
            // Element-side volume changes (e.g., by the browser UI) sync back.
            // Not critical — the app controls volume.
        };

        v.addEventListener('timeupdate', onTimeUpdate);
        v.addEventListener('durationchange', onDurationChange);
        v.addEventListener('play', onPlay);
        v.addEventListener('pause', onPause);
        v.addEventListener('waiting', onWaiting);
        v.addEventListener('playing', onPlaying);
        v.addEventListener('canplay', onCanPlay);
        v.addEventListener('progress', onProgress);
        v.addEventListener('ended', onEnded);
        v.addEventListener('error', onError);

        return () => {
            v.removeEventListener('timeupdate', onTimeUpdate);
            v.removeEventListener('durationchange', onDurationChange);
            v.removeEventListener('play', onPlay);
            v.removeEventListener('pause', onPause);
            v.removeEventListener('waiting', onWaiting);
            v.removeEventListener('playing', onPlaying);
            v.removeEventListener('canplay', onCanPlay);
            v.removeEventListener('progress', onProgress);
            v.removeEventListener('ended', onEnded);
            v.removeEventListener('error', onError);
        };
    }, [setPos, setBuffered, setBuffering, syncPlayingFromElement, settings.autoplayNext, media.title, toast]);

    /* Fullscreen escape handling. */
    useEffect(() => {
        if (!fullscreen) return;
        pushEscapeHandler('fullscreen', () => toggleFullscreen());
        return () => popEscapeHandler('fullscreen');
    }, [fullscreen, toggleFullscreen, pushEscapeHandler, popEscapeHandler]);

    const entries: ContextMenuEntry[] = [
        {
            label: playing ? 'Pause' : 'Play',
            icon: playing ? 'pause' : 'play',
            shortcut: 'Space',
            onSelect: () => setPlayingAnnounced(!playing),
        },
        { kind: 'separator' },
        {
            kind: 'submenu', label: 'Audio track', icon: 'audio',
            items: [
                { label: 'English', onSelect: () => { setAudioTrack(0); toast('Audio: English — Undo'); } },
                { label: 'German', onSelect: () => { setAudioTrack(1); toast('Audio: German — Undo'); } },
                { label: 'Commentary', onSelect: () => { setAudioTrack(2); toast('Audio: Commentary — Undo'); } },
            ],
        },
        {
            kind: 'submenu', label: 'Subtitles', icon: 'cc',
            items: [
                { label: 'Off', onSelect: () => { setSubTrack(-1); toast('Subtitles off'); } },
                { label: 'English', onSelect: () => { setSubTrack(0); toast('Subtitles: English'); } },
                { label: 'German', onSelect: () => { setSubTrack(1); toast('Subtitles: German'); } },
            ],
        },
        { kind: 'separator' },
        {
            label: 'Aspect ratio', icon: 'grid',
            onSelect: () => {
                const next = settings.defaultAspect === 'fit' ? 'fill' : settings.defaultAspect === 'fill' ? 'stretch' : 'fit';
                setSetting('defaultAspect', next);
                toast(`Aspect: ${next} — Undo`);
            },
        },
        { label: 'Snapshot', icon: 'film', onSelect: takeSnapshot },
        { kind: 'separator' },
        { label: 'Fullscreen', icon: 'full', shortcut: 'F', onSelect: () => toggleFullscreen() },
        { label: 'Media info', icon: 'info', onSelect: () => setMediaInfoOpen(!mediaInfoOpen) },
    ];

    const objectFit =
        settings.defaultAspect === 'fill' ? 'object-cover'
            : settings.defaultAspect === 'stretch' ? 'object-fill'
                : 'object-contain';

    return (
        <div className="p-0.5 flex flex-col gap-3.5 h-full min-h-0">
            <div
                id="openreel-stage"
                onContextMenu={e => openCtx(e, undefined)}
                className="flex-1 min-h-0 rounded-lg relative overflow-hidden bg-video border-0 border-border shadow-[0_20px_50px_rgba(0,0,0,.45)] flex flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:p-0"
            >
                <div className="flex-1 relative">
                    {/* The real video element. */}
                    <video
                        ref={localRef}
                        src={media.url || undefined}
                        className={`absolute inset-0 w-full h-full ${objectFit} bg-black p-0`}
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                    />

                    {/* Title overlay — subtle, doesn't block interaction. */}
                    <div className={`absolute top-4 left-4.5 z-3 pointer-events-none transition-opacity duration-1000 ${fullscreen ? (playing ? (visible ? 'opacity-100' : 'opacity-0') : '') : ''}`}
                        aria-hidden={!visible}
                    >
                        <div className="text-[13px] font-semibold text-[#e9ebee] drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
                            {media.title}
                        </div>
                        <div className="text-[11px] text-[rgba(233,235,238,.6)] mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
                            {media.sub}
                        </div>
                    </div>

                    {/* Play overlay (no media playing) */}
                    {!offline && !playing && (
                        <div className="absolute inset-0 flex items-center justify-center z-2 bg-[rgba(0,0,0,.2)]">
                            <button
                                onClick={() => setPlayingAnnounced(true)}
                                aria-label="Play"
                                className="w-[74px] h-[74px] rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/85 backdrop-blur-[2px] transition-transform hover:scale-105 hover:bg-white/15 active:scale-95"
                            >
                                <Icon name="play" size={26} />
                            </button>
                        </div>
                    )}

                    {/* Playing indicator */}
                    {playing && !buffering && !offline && !fullscreen && (
                        <div className="hidden absolute left-1/2 bottom-5.5 -translate-x-1/2 z-4 flex items-center gap-2.5 px-4 py-2 rounded-[20px] bg-[rgba(12,14,17,.82)] border border-white/10 text-[#e9ebee] text-[12px] shadow-md whitespace-nowrap animate-fade-up pointer-events none">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                            <span>Playing · {fmt(pos * dur)} / {fmt(dur)}</span>
                        </div>
                    )}

                    {/* Buffering */}
                    {buffering && (
                        <div className="absolute left-1/2 bottom-5.5 -translate-x-1/2 z-4 flex items-center gap-2.5 px-4 py-2 rounded-[20px] bg-[rgba(12,14,17,.82)] border border-white/10 text-[#e9ebee] text-[12px] shadow-md whitespace-nowrap pointer-events-none">
                            <span className="w-3 h-3 rounded-full border-2 border-border-2 border-t-accent animate-spin-slow" />
                            <span>Buffering…</span>
                        </div>
                    )}

                    {/* Offline */}
                    {offline && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-5 bg-[rgba(8,9,11,.9)] p-7.5 text-center">
                            <Icon name="wifiOff" size={26} weight={1.5} className="text-warning" />
                            <h3 className="text-[15px] font-[650] text-[#e9ebee] m-0">Connection lost</h3>
                            <p className="text-[12.5px] text-[rgba(233,235,238,.55)] m-0 max-w-[46ch] leading-relaxed">
                                Reconnecting in 5 s — attempt 2 of 5. Your position is preserved.
                            </p>
                            <div className="flex gap-2.5 mt-1.5">
                                <Button variant="primary" size="sm">Retry now</Button>
                                <Button size="sm">Stop</Button>
                            </div>
                        </div>
                    )}
                </div>

                {fullscreen && <FullscreenTransport visible={visible} setVisible={setVisible} />}
            </div>

            {ctxMenu && (
                <ContextMenu position={ctxMenu.position} entries={entries} onClose={closeCtx} />
            )}
        </div>
    );
}
