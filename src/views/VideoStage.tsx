import { useEffect, useRef, useState } from 'react';
import type { VideoMedia } from '../types';
import { Button } from '../components/Button';
import { ContextMenu } from '../components/ContextMenu/Menu';
import { usePlayer } from "../hooks/player";
import Icon from '../lib/Icons';
import { fmt } from '../lib/format';
import { FullscreenTransport } from '../components/Transport/Fullscreen';
import type { ContextMenuEntry, ContextMenuItem } from '../types/contextmenu';
import { useContextMenu } from '../hooks/useContextMenu';
import { SubtitleOverlay } from '../components/SubtitleOverlay';
import { useMkvSource } from '../hooks/useMkvSource';
import { formatTrackLabel } from '../helpers/media';

export function VideoStage({ media }: { media: VideoMedia }) {
    const [visible, setVisible] = useState(true);
    const mkv = useMkvSource(media.url);
    const videoSrc = mkv.url ?? media.url;
    const p = usePlayer();

    const { state: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu<undefined>();
    const localRef = useRef<HTMLVideoElement | null>(null);

    /* Register the element with the context on mount. */
    useEffect(() => {
        p.registerVideoElement(localRef.current);
        return () => p.registerVideoElement(null);
    }, [p.registerVideoElement]);

    useEffect(() => {
        const v = localRef.current;
        if (!v) return;

        const onTimeUpdate = () => {
            if (Number.isFinite(v.duration) && v.duration > 0) {
                p.setPos(v.currentTime / v.duration);
            }
        };
        const onDurationChange = () => {
            if (Number.isFinite(v.duration) && v.duration > 0 && media.dur !== v.duration) {
                p.updateMediaDuration(v.duration);
            }
        };
        const onPlay = () => p.syncPlayingFromElement(true);
        const onPause = () => p.syncPlayingFromElement(false);
        const onWaiting = () => p.setBuffering(true);
        const onPlaying = () => p.setBuffering(false);
        const onCanPlay = () => p.setBuffering(false);
        const onProgress = () => {
            if (v.buffered.length > 0) {
                const end = v.buffered.end(v.buffered.length - 1);
                if (Number.isFinite(v.duration) && v.duration > 0) {
                    p.setBuffered(end / v.duration);
                }
            }
        };
        const onEnded = () => {
            p.syncPlayingFromElement(false);
            // Advance queue if autoplay is on, else reset to start.
            if (p.settings.autoplayNext) {
                // nextItem();
            } else {
                p.setPos(0);
                v.currentTime = 0;
            }
        };
        const onError = () => {
            // Route to error stage — the media is unplayable.
            // For the demo, just toast. Real routing depends on the error code.
            p.toast(`Couldn't load ${media.title}`, 'err');
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
    }, [p.setPos, p.setBuffered, p.setBuffering, p.syncPlayingFromElement, p.settings.autoplayNext, media.title, p.toast]);

    /* Fullscreen escape handling. */
    useEffect(() => {
        if (!p.fullscreen) return;
        p.pushEscapeHandler('fullscreen', () => p.toggleFullscreen());
        return () => p.popEscapeHandler('fullscreen');
    }, [p.fullscreen, p.toggleFullscreen, p.pushEscapeHandler, p.popEscapeHandler]);

    useEffect(() => {
        p.setAudioTracks(mkv.audioTracks);
        p.setSubtitleTracks(mkv.subtitleTracks);
    }, [mkv.audioTracks, mkv.subtitleTracks, p.setAudioTracks, p.setSubtitleTracks]);

    const audioMenuItems = (): ContextMenuItem[] => {
        if (p.audioTracks && p.audioTracks.length > 0) {
            return p.audioTracks.map((t, i) => (
                {
                    label: formatTrackLabel(t.language, t.title, `Audio ${i + 1}`),
                    onSelect: () => {
                        p.setAudioTrack(i);
                        void mkv.setAudioStream(t.streamIndex);
                        p.toast(`Audio: ${formatTrackLabel(t.language, t.title, `Track ${i + 1}`)} — Undo`);
                    },
                    tick: p.audioTrack === i,
                    separatorBefore: true,
                }
            ));
        }
        // Fallback for non-MKV media.
        return [
            {
                label: 'English', onSelect: () => { p.setAudioTrack(0); p.toast('Audio: English — Undo'); }, //tick: p.audioTrack === 0
            },
            {
                label: 'German', onSelect: () => { p.setAudioTrack(1); p.toast('Audio: German — Undo'); },
                //tick: p.audioTrack === 1
            },
            {
                label: 'Commentary', onSelect: () => { p.setAudioTrack(2); p.toast('Audio: Commentary — Undo'); }, //tick: p.audioTrack === 2
            },
        ];
    };

    const subtitleMenuItems = (): ContextMenuItem[] => {
        const items: ContextMenuItem[] = [
            {
                label: 'Off',
                onSelect: () => { p.setSubTrack(-1); p.toast('Subtitles off'); },
                // tick: p.subTrack === -1,
                separatorBefore: true,
            },
        ];
        if (p.subtitleTracks && p.subtitleTracks.length > 0) {
            p.subtitleTracks.forEach((t, i) => {
                items.push({
                    label: formatTrackLabel(t.language, t.title, `Subtitle ${i + 1}`),
                    onSelect: () => {
                        p.setSubTrack(i);
                        p.toast(`Subtitles: ${formatTrackLabel(t.language, t.title, `Track ${i + 1}`)}`);
                    },
                    separatorBefore: true,
                    // tick: p.subTrack === i,
                });
            });
        } else {
            // Fallback for non-MKV media.
            items.push(
                {
                    label: 'English', onSelect: () => { p.setSubTrack(0); p.toast('Subtitles: English'); }, //tick: p.subTrack === 0
                },
                {
                    label: 'German', onSelect: () => { p.setSubTrack(1); p.toast('Subtitles: German'); }, //tick: p.subTrack === 1
                },
            );
        }
        return items;
    };

    const entries: ContextMenuEntry[] = [
        {
            label: p.playing ? 'Pause' : 'Play',
            icon: p.playing ? 'pause' : 'play',
            shortcut: 'Space',
            onSelect: () => p.setPlayingAnnounced(!p.playing),
        },
        { kind: 'separator' },
        {
            kind: 'submenu', label: 'Audio track', icon: 'audio',
            items: audioMenuItems(),
        },
        { kind: 'separator' },
        {
            kind: 'submenu', label: 'Subtitles', icon: 'cc',
            items: subtitleMenuItems(),
        },
        { kind: 'separator' },
        {
            label: 'Aspect ratio', icon: 'grid',
            onSelect: () => {
                const next = p.settings.defaultAspect === 'fit' ? 'fill' : p.settings.defaultAspect === 'fill' ? 'stretch' : 'fit';
                p.setSetting('defaultAspect', next);
                p.toast(`Aspect: ${next} — Undo`);
            },
        },
        { label: 'Snapshot', icon: 'film', onSelect: p.takeSnapshot },
        { kind: 'separator' },
        { label: 'Fullscreen', icon: 'full', shortcut: 'F', onSelect: () => p.toggleFullscreen() },
        { label: 'Media info', icon: 'info', onSelect: () => p.setMediaInfoOpen(!p.mediaInfoOpen) },
    ];

    const objectFit =
        p.settings.defaultAspect === 'fill' ? 'object-cover'
            : p.settings.defaultAspect === 'stretch' ? 'object-fill'
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
                        src={videoSrc || undefined}
                        className={`absolute inset-0 w-full h-full ${objectFit} bg-black`}
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                    >
                    </video>
                    <SubtitleOverlay cues={mkv.subtitleTracks?.[p.subTrack]?.cues ?? null} currentTime={p.pos * p.dur} />

                    {/* Title overlay — subtle, doesn't block interaction. */}
                    <div className={`absolute top-4 left-4.5 z-3 pointer-events-none transition-opacity duration-1000 ${p.fullscreen ? (p.playing ? (visible ? 'opacity-100' : 'opacity-0') : '') : ''}`}
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
                    {!p.offline && !p.playing && (
                        <div className="absolute inset-0 flex items-center justify-center z-2 bg-[rgba(0,0,0,.2)]">
                            <button
                                onClick={() => p.setPlayingAnnounced(true)}
                                aria-label="Play"
                                className="w-[74px] h-[74px] rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/85 backdrop-blur-[2px] transition-transform hover:scale-105 hover:bg-white/15 active:scale-95"
                            >
                                <Icon name="play" size={26} />
                            </button>
                        </div>
                    )}

                    {/* Playing indicator */}
                    {p.playing && !p.buffering && !p.offline && !p.fullscreen && (
                        <div className="hidden absolute left-1/2 bottom-5.5 -translate-x-1/2 z-4 flex items-center gap-2.5 px-4 py-2 rounded-[20px] bg-[rgba(12,14,17,.82)] border border-white/10 text-[#e9ebee] text-[12px] shadow-md whitespace-nowrap animate-fade-up pointer-events none">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                            <span>Playing · {fmt(p.pos * p.dur)} / {fmt(p.dur)}</span>
                        </div>
                    )}

                    {/* Buffering */}
                    {p.buffering && (
                        <div className="absolute left-1/2 bottom-5.5 -translate-x-1/2 z-4 flex items-center gap-2.5 px-4 py-2 rounded-[20px] bg-[rgba(12,14,17,.82)] border border-white/10 text-[#e9ebee] text-[12px] shadow-md whitespace-nowrap pointer-events-none">
                            <span className="w-3 h-3 rounded-full border-2 border-border-2 border-t-accent animate-spin-slow" />
                            <span>Buffering…</span>
                        </div>
                    )}

                    {/* Offline */}
                    {p.offline && (
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
                {p.fullscreen && <FullscreenTransport visible={visible} setVisible={setVisible} />}
            </div>

            {ctxMenu && (
                <ContextMenu position={ctxMenu.position} entries={entries} onClose={closeCtx} />
            )}
        </div>
    );
}
