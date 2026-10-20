import { useEffect, useRef } from 'react';
import type { AudioMedia } from '../types';
import { usePlayer } from '../hooks/player';
import { WAVE, fmt } from '../lib/format';
import { Chip } from '../components/Chip';

export function AudioStage({ media }: { media: AudioMedia }) {
    const p = usePlayer();
    const localRef = useRef<HTMLVideoElement | null>(null);

    /* Callback ref — same pattern as VideoStage, guarantees registration
     *      happens exactly when the element mounts. */
    const setVideoRef = (el: HTMLVideoElement | null) => {
        localRef.current = el;
        p.registerVideoElement(el);
    };

    /* Element events — identical wiring to VideoStage. Push state back
     *      into context so the transport, seek bar, and playback indicator
     *      all stay in sync. */
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
        const onPlaying = () => {
            p.setBuffering(false);
            p.syncPlayingFromElement(true);
        };
        const onLoadedMetadata = () => {
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
        const onWaiting = () => p.setBuffering(true);
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
            if (p.settings.autoplayNext) {
                p.nextItem();
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
        v.addEventListener('playing', onPlaying);
        v.addEventListener('waiting', onWaiting);
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
            v.removeEventListener('playing', onPlaying);
            v.removeEventListener('waiting', onWaiting);
            v.removeEventListener('canplay', onCanPlay);
            v.removeEventListener('progress', onProgress);
            v.removeEventListener('ended', onEnded);
            v.removeEventListener('error', onError);
            v.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
    }, [
        p.setPos, p.setBuffered, p.setBuffering, p.syncPlayingFromElement,
        p.settings.autoplayNext, p.nextItem, media.title, media.dur,
        p.toast, p.updateMediaDuration, p.consumePendingPlayback,
    ]);

    /* Clear any stale track metadata from previous MKV sessions. */
    useEffect(() => {
        p.setAudioTracks(null);
        p.setSubtitleTracks(null);
    }, [media.id, p.setAudioTracks, p.setSubtitleTracks]);

    const playedCount = Math.round(p.pos * WAVE.length);

    const handleWaveClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
        p.seekTo(fraction);
    };

    return (
        <div className="min-h-full flex items-center justify-center p-11 px-6 relative
        before:content-[''] before:absolute before:inset-0 before:pointer-events-none
        before:bg-[radial-gradient(560px_340px_at_50%_30%,var(--color-accent-soft),transparent_72%)]">

            {/* Hidden video element — carries the audio stream. */}
            <video
                ref={setVideoRef}
                src={media.url || undefined}
                className="hidden"
                preload="metadata"
                crossOrigin="anonymous"
            />

            <div className="w-full max-w-[480px] flex flex-col items-center relative">
                <div className="w-[210px] h-[210px] rounded-lg overflow-hidden relative
        shadow-[0_24px_56px_rgba(0,0,0,.55)] border border-border-2 mb-6.5 shrink-0">
                    <svg viewBox="0 0 200 200" aria-hidden="true" className="absolute inset-0 w-full h-full">
                        <defs>
                            <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#22262d" />
                                <stop offset="100%" stopColor="#15181d" />
                            </linearGradient>
                        </defs>
                        <rect width="200" height="200" fill="url(#ag)" />
                        <g fill="none" stroke="#e8875a" strokeOpacity="0.22" strokeWidth="1.1">
                            {[26, 42, 58, 74, 90].map(r => <circle key={r} cx="100" cy="100" r={r} />)}
                        </g>
                        <g fill="none" stroke="#e8875a" strokeOpacity="0.42" strokeWidth="1.4">
                            <path d="M20 132c14-30 30-46 46-46s30 18 44 40 28 34 46 34" />
                        </g>
                        <circle cx="100" cy="100" r="6" fill="#e8875a" fillOpacity="0.7" />
                    </svg>
                </div>

                <div className="text-[20px] font-[670] tracking-[-.02em] text-center mb-1.5">{media.title}</div>
                <div className="text-[13px] text-text-2 text-center">{media.artist}</div>
                <div className="text-[11.5px] text-text-3 text-center mt-0.5">{media.album} · {media.year}</div>
                <div className="text-[11px] text-text-3 text-center mt-3 tabular-nums px-3 py-1 rounded-[20px]
        bg-surface border border-border">
                    {media.meta}
                </div>

                <div
                    className="flex items-center gap-0.5 h-15 w-full my-6.5 mb-2 cursor-pointer group"
                    onClick={handleWaveClick}
                >
                    {WAVE.map((v, i) => (
                        <i
                            key={i}
                            className={`flex-1 rounded-[2px] min-h-[3px] transition-[background,opacity]
                ${i < playedCount ? 'bg-accent opacity-95' : 'bg-text-3 opacity-35 group-hover:opacity-60'}`}
                            style={{ height: v * 100 + '%' }}
                        />
                    ))}
                </div>

                <div className="flex justify-between w-full text-[11px] text-text-3 tabular-nums mb-5">
                    <span>{fmt(p.pos * p.dur)}</span>
                    <span>−{fmt((1 - p.pos) * p.dur)}</span>
                </div>

                <div className="flex gap-2 flex-wrap justify-center">
                    <Chip tone="acc" icon="zap">Normalise: ReplayGain (track)</Chip>
                    <Chip icon="cpu">Output: PipeWire · Built-in Audio</Chip>
                    <Chip icon="chevRight">Technical details</Chip>
                </div>
            </div>
        </div>
    );
}
