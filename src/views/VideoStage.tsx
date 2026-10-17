import { useEffect } from 'react';
import type { VideoMedia } from '../types';
import { Button } from '../components/Button';
import { ContextMenu } from '../components/ContextMenu/Menu';
import { usePlayer } from '../state/PlayerContext';
import Icon from '../lib/Icons';
import { fmt } from '../lib/format';
import { FullscreenTransport } from '../components/Transport/Fullscreen';
import type { ContextMenuEntry } from '../types/contextmenu';
import { useContextMenu } from '../lib/useContextMenu';

export function VideoStage({ media }: { media: VideoMedia }) {
    const {
        playing, setPlayingAnnounced,
        pos, buffering, offline,
        fullscreen, toggleFullscreen,
        pushEscapeHandler, popEscapeHandler,
        settings, setSetting, takeSnapshot,
        setAudioTrack,
        setSubTrack,
        toast,
    } = usePlayer();

    const { state: ctxMenu, open: openCtx, close: closeCtx } = useContextMenu<undefined>();

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
        {
            label: 'Media info', icon: 'info',
            onSelect: () => toast('Media info panel is not implemented yet'),
        },
    ];

    return (
        <div className="p-3.5 flex flex-col gap-3.5 h-full min-h-0">
            <div
                id="openreel-stage"
                onContextMenu={e => openCtx(e, undefined)}
                className="flex-1 min-h-0 rounded-lg relative overflow-hidden bg-video border border-border
        shadow-[0_20px_50px_rgba(0,0,0,.45)] flex flex-col
        [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:p-0"
            >
                <div className="flex-1 relative">
                    <div className="absolute inset-0 pointer-events-none
        bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,.05),transparent_62%)]" />

                    <div className="absolute top-4 left-4.5 z-3 pointer-events-none">
                        <div className="text-[13px] font-semibold text-[#e9ebee]">{media.title}</div>
                        <div className="text-[11px] text-[rgba(233,235,238,.5)] mt-0.5">{media.sub}</div>
                    </div>

                    {!offline && !playing && (
                        <div className="absolute inset-0 flex items-center justify-center z-2">
                            <button
                                onClick={() => setPlayingAnnounced(true)}
                                aria-label="Play"
                                className="w-[74px] h-[74px] rounded-full bg-white/6 border border-white/10
            flex items-center justify-center text-white/62 backdrop-blur-[2px]
            transition-transform hover:scale-105 active:scale-95"
                            >
                                <Icon name="play" size={26} />
                            </button>
                        </div>
                    )}

                    {playing && !buffering && !offline && (
                        <div className="absolute left-1/2 bottom-5.5 -translate-x-1/2 z-4 flex items-center gap-2.5
            px-4 py-2 rounded-[20px] bg-[rgba(12,14,17,.82)] border border-white/10
            text-[#e9ebee] text-[12px] shadow-md whitespace-nowrap animate-fade-up">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                            <span>Playing · {fmt(pos * media.dur)} / {fmt(media.dur)}</span>
                        </div>
                    )}

                    {buffering && (
                        <div className="absolute left-1/2 bottom-5.5 -translate-x-1/2 z-4 flex items-center gap-2.5
            px-4 py-2 rounded-[20px] bg-[rgba(12,14,17,.82)] border border-white/10
            text-[#e9ebee] text-[12px] shadow-md whitespace-nowrap">
                            <span className="w-3 h-3 rounded-full border-2 border-border-2 border-t-accent animate-spin-slow" />
                            <span>Buffering… 42%</span>
                        </div>
                    )}

                    {offline && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-5
            bg-[rgba(8,9,11,.9)] p-7.5 text-center">
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

                {fullscreen && <FullscreenTransport />}
            </div>

            {ctxMenu && (
                <ContextMenu
                    position={ctxMenu.position}
                    entries={entries}
                    onClose={closeCtx}
                />
            )}
        </div>
    );
}
