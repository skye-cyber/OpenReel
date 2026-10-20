import { useEffect, useMemo, useState } from 'react';
import Icon from '../lib/Icons';
import { usePlayer } from '../hooks/player';
import { fmt } from '../lib/format';
import { Dl, Row, Section } from './Media/subcmp';
import { StreamCard } from './Media/Card';
import { guessFrameRate, inferContainer } from '../helpers/media';
import type { MediaProbe } from '../types/library';
import { librarymanager } from '../lib/platform/library';

/* Cache probe results per file path so re-opening the panel is instant. */
const probeCache = new Map<string, MediaProbe>();

export function MediaInfo() {
    const {
        media, mediaInfoOpen, setMediaInfoOpen,
        pushEscapeHandler, popEscapeHandler,
    } = usePlayer();

    useEffect(() => {
        if (!mediaInfoOpen) return;
        pushEscapeHandler('media-info', () => setMediaInfoOpen(false));
        return () => popEscapeHandler('media-info');
    }, [mediaInfoOpen, setMediaInfoOpen, pushEscapeHandler, popEscapeHandler]);

    const [probe, setProbe] = useState<MediaProbe | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!mediaInfoOpen || !media || media.kind === 'error') {
            setProbe(null);
            return;
        }

        const cached = probeCache.get(media.id);
        if (cached) {
            setProbe(cached);
            return;
        }

        let cancelled = false;
        setLoading(true);

        void librarymanager.probeMediaFile(media.id)
            .then(p => {
                if (cancelled) return;
                probeCache.set(media.id, p);
                setProbe(p);
            })
            .catch(() => {
                if (cancelled) return;
                setProbe(null);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [mediaInfoOpen, media]);

    /* Element-derived info: resolution, frame rate, current time. */
    const element = useMemo(() => {
        const v = document.querySelector<HTMLVideoElement>('video');
        if (!v) return null;
        return {
            videoWidth: v.videoWidth,
            videoHeight: v.videoHeight,
            currentTime: v.currentTime,
            duration: v.duration,
        };
    }, [mediaInfoOpen, media?.id]);

    if (!mediaInfoOpen || !media) return null;

    const container = inferContainer(media);
    const resolution =
        element && element.videoWidth > 0 && element.videoHeight > 0
            ? `${element.videoWidth}×${element.videoHeight}`
            : '—';

    return (
        <aside className="w-[360px] shrink-0 flex flex-col bg-surface border-l border-border animate-slide-in">
            {/* Header */}
            <div className="flex items-start gap-3 p-3.5 border-b border-border">
                <div className="w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-3 shrink-0">
                    <Icon name="info" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-[12.5px] font-[650] truncate">Media info</div>
                        {loading && (
                            <span className="w-3 h-3 rounded-full border-2 border-border-2 border-t-accent animate-spin-slow shrink-0" />
                        )}
                    </div>
                    <div className="text-[11px] text-text-3 truncate">{media.title}</div>
                </div>
                <button
                    onClick={() => setMediaInfoOpen(false)}
                    className="w-6 h-6 rounded-sm flex items-center justify-center text-text-3 hover:text-text hover:bg-hover transition-colors shrink-0"
                    aria-label="Close media info"
                >
                    <Icon name="x" size={14} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {/* General */}
                <Section title="General">
                    <Dl>
                        <Row label="Container" value={container} />
                        <Row label="Duration" value={probe ? fmt(probe.duration || (media.dur || 0)) : fmt(media.dur || 0)} mono />
                        <Row label="File path" value={media.id.replace(media.title, '')} mono small />
                        {probe && probe.hasVideo && (
                            <Row label="Resolution" value={resolution} mono />
                        )}
                    </Dl>
                </Section>

                {/* Video */}
                {probe?.hasVideo && (
                    <Section title="Video">
                        <StreamCard
                            kind="video"
                            index={0}
                            codec={probe.videoCodec || '—'}
                            spec={resolution}
                            extra={[
                                { label: 'Frame rate', value: element?.videoWidth ? guessFrameRate(media) : '—' },
                            ]}
                        />
                    </Section>
                )}

                {/* Audio */}
                {probe?.hasAudio && (
                    <Section title="Audio">
                        <StreamCard
                            kind="audio"
                            index={probe.hasVideo ? 1 : 0}
                            codec={probe.audioCodec || '—'}
                            spec="—"
                            extra={[
                                { label: 'Channels', value: '—' },
                                { label: 'Sample rate', value: '—' },
                            ]}
                        />
                    </Section>
                )}

                {/* If probe is null (still loading or failed) */}
                {!probe && !loading && (
                    <div className="px-3.5 py-6 text-[11.5px] text-text-3 text-center">
                        Couldn't read media metadata.
                        {' '}Is ffprobe installed?
                    </div>
                )}

                {!probe && loading && (
                    <div className="px-3.5 py-6 text-[11.5px] text-text-3 text-center">
                        Reading metadata…
                    </div>
                )}
            </div>

            <div className="px-3.5 py-2.5 border-t border-border text-[10.5px] text-text-3 leading-snug">
                Metadata from ffprobe.
            </div>
        </aside>
    );
}



