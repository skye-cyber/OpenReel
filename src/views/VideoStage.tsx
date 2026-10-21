import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoMedia } from '../types';
import { Button } from '../components/Button';
import { ContextMenu } from '../components/ContextMenu/Menu';
import { usePlayer } from "../hooks/player";
import Icon from '../lib/Icons';
import { FullscreenTransport } from '../components/Transport/Fullscreen';
import type { ContextMenuEntry, ContextMenuItem } from '../types/contextmenu';
import { useContextMenu } from '../hooks/useContextMenu';
import { SubtitleOverlay } from '../components/SubtitleOverlay';
import { CloseMediaButton } from '../components/mediaButton';
import { fmt } from '../lib/format';

/**
 * **VideoStage**\
 * *pointer-events-none* means the transport underneath stays clickable. If the user clicks Next during a p.transcode, nextItem fires, playMedia runs for the next item. If that item also needs transcoding, setTranscode replaces the current p.transcode state with the new media's. The old p.transcode keeps running in the Rust background — its result lands in the cache. When the user navigates back to the first file, prepareTranscode returns cached: true instantly. No re-p.transcode. Correct behavior
 * */
export function VideoStage({ media }: { media: VideoMedia }) {
    const [visible, setVisible] = useState(true);
    const p = usePlayer();

    const { state: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu<undefined>();
    const localRef = useRef<HTMLVideoElement | null>(null);
    //     const [playableUrl, setPlayableUrl] = useState<string | undefined>()
    /* Register the element with the context on mount. */
    const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
        localRef.current = el;
        p.registerVideoElement(el);
    }, [p.registerVideoElement]);

    const transcodeForThis = p.transcode?.mediaId === media.id ? p.transcode : null;

    let playableUrl =
        transcodeForThis?.status === 'running' ? undefined
            : transcodeForThis?.status === 'error' ? undefined
                : media.url || undefined;

    //     console.log("Media B", playableUrl)
    useEffect(() => {
        const v = localRef.current;
        if (!v) return;
        p.setBuffering(true)

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
        const onPlaying = () => {
            if (!p.playing) p.syncPlayingFromElement(true);
            p.setBuffering(false);
        }
        const onLoadedMetadata = () => {
            p.setBuffering(false)
            const { seek, play } = p.consumePendingPlayback();
            if (seek !== null && Number.isFinite(v.duration) && v.duration > 0) {
                try {
                    v.currentTime = seek;
                } catch { /* ignore */ }
            }
            if (play) {
                void v.play().catch(() => p.syncPlayingFromElement(false));
            }
        };
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
            if (p.mediaRef && p.mediaRef.current?.id !== media.id) return;  // stale element, media changed
            p.syncPlayingFromElement(false);
            if (p.settings.autoplayNext) {
                requestAnimationFrame(() => p.nextItem());
            } else {
                p.setPos(0);
                v.currentTime = 0;
            }
        };
        const onError = () => {
            p.toast(`Couldn't load ${media.title}`, 'err');
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
        v.addEventListener('loadedmetadata', onLoadedMetadata);

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
            v.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
    }, [
        p.setPos, p.setBuffered, p.setBuffering, p.syncPlayingFromElement,
        p.settings.autoplayNext, p.nextItem, media.title, media.dur,
        p.toast, p.updateMediaDuration,
    ]);

    /* Fullscreen escape handling. */
    useEffect(() => {
        if (!p.fullscreen) return;
        p.pushEscapeHandler('fullscreen', () => p.toggleFullscreen());
        return () => p.popEscapeHandler('fullscreen');
    }, [p.fullscreen, p.toggleFullscreen, p.pushEscapeHandler, p.popEscapeHandler]);

    /* Clear any stale track metadata left over from a previous MKV session. */
    useEffect(() => {
        p.setAudioTracks([]);
        p.setSubtitleTracks([]);
    }, [media.id, p.setAudioTracks, p.setSubtitleTracks]);

    /* Fallback context menus for non-MKV media — the mock track names. */
    const audioMenuItems = (): ContextMenuItem[] => [
        {
            label: 'English',
            onSelect: () => { p.setAudioTrack(0); p.toast('Audio: English — Undo'); },
            separatorBefore: true,
        },
        {
            label: 'German',
            onSelect: () => { p.setAudioTrack(1); p.toast('Audio: German — Undo'); },
        },
        {
            label: 'Commentary',
            onSelect: () => { p.setAudioTrack(2); p.toast('Audio: Commentary — Undo'); },
        },
    ];

    const subtitleMenuItems = (): ContextMenuItem[] => [
        {
            label: 'Off',
            onSelect: () => { p.setSubTrack(-1); p.toast('Subtitles off'); },
            separatorBefore: true,
        },
        {
            label: 'English',
            onSelect: () => { p.setSubTrack(0); p.toast('Subtitles: English'); },
        },
        {
            label: 'German',
            onSelect: () => { p.setSubTrack(1); p.toast('Subtitles: German'); },
        },
    ];

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
    //     playableUrl = media.url || undefined;
    console.log("[-]Media A", playableUrl)

    return (
        <div className="p-0.5 flex flex-col gap-3.5 h-full min-h-0">
            <div
                id="openreel-stage"
                onContextMenu={e => openCtx(e, undefined)}
                className="flex-1 min-h-0 rounded-lg relative overflow-hidden bg-video border-0 border-border shadow-[0_20px_50px_rgba(0,0,0,.45)] flex flex-col [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:p-0 select-none"
            >
                <div className="flex-1 relative">
                    {transcodeForThis && transcodeForThis.status !== 'done' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-video z-20 pointer-events-none">
                            {transcodeForThis.status === 'running' && (
                                <>
                                    <div className="w-14 h-14 rounded-full border-2 border-border-2 border-t-accent animate-spin-standard" />
                                    <div className="text-[13px] font-semibold text-[#e9ebee]">Preparing video…</div>
                                    <div className="w-[220px]">
                                        <div className="h-1 rounded-full bg-[rgba(255,255,255,.1)] overflow-hidden">
                                            <div
                                                className="h-full bg-accent transition-[width] duration-200"
                                                style={{ width: `${Math.round(p.transcode.percent * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-[rgba(233,235,238,.55)] tabular-nums">
                                        {Math.round(p.transcode.percent * 100)}%
                                        {p.transcode.speed > 0 && ` · ${p.transcode.speed.toFixed(1)}×`}
                                        {p.transcode.totalSeconds > 0 && ` · ${fmt(p.transcode.processedSeconds)} / ${fmt(p.transcode.totalSeconds)}`}
                                    </div>
                                    <div className="text-[10.5px] text-[rgba(233,235,238,.4)] max-w-[36ch] text-center leading-relaxed">
                                        Converting this file to a format the player can display.
                                        Playback starts automatically when ready.
                                    </div>
                                </>
                            )}

                            {p.transcode.status === 'error' && (
                                <>
                                    <Icon name="alert" size={26} className="text-danger" />
                                    <div className="text-[13px] font-semibold text-[#e9ebee]">Couldn't prepare this file</div>
                                    <div className="text-[11.5px] text-[rgba(233,235,238,.55)] max-w-[46ch] text-center">
                                        {p.transcode.error ?? 'The conversion failed.'}
                                    </div>
                                    <Button size="sm" variant="primary" onClick={() => p.setTranscode(null)}>
                                        Dismiss
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                    <video
                        key={`${media.id}:${media.url ?? ''}`}
                        ref={setVideoRef}
                        src={playableUrl || undefined}
                        className={`absolute inset-0 w-full h-full ${objectFit} bg-black`}
                        playsInline
                        preload="metadata"
                        crossOrigin="anonymous"
                    />
                    <SubtitleOverlay
                        cues={null}
                        currentTime={p.pos * p.dur}
                    />

                    {/* Title overlay — subtle, doesn't block interaction. */}
                    <div
                        className={`absolute flex justify-between w-[98%] top-4 left-4.5 z-3 pointer-events-none transition-opacity duration-1000 ${p.fullscreen ? (p.playing ? (visible ? 'opacity-100' : 'opacity-0') : '') : ''
                            }`}
                        aria-hidden={!visible}
                    >
                        <div>
                            <div className="text-[13px] font-semibold text-[#e9ebee] drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
                                {media.title}
                            </div>
                            <div className="text-[11px] text-[rgba(233,235,238,.6)] mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
                                {media.sub}
                            </div>
                        </div>
                        <CloseMediaButton />
                    </div>

                    {/* Play overlay */}
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

                    {/* Buffering */}
                    {p.buffering && (
                        <div className="hidden absolute left-1/2 bottom-5.5 -translate-x-1/2 z-4 flex items-center gap-2.5 px-4 py-2 rounded-[20px] bg-[rgba(12,14,17,.82)] border border-white/10 text-[#e9ebee] text-[12px] shadow-md whitespace-nowrap pointer-events-none">
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
                                Reconnecting ...
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
