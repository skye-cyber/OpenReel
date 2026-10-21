import { useEffect, useState } from 'react';
import Icon from '../lib/Icons';
import { usePlayer } from '../hooks/player';
import { fmt } from '../lib/format';
import { Dl, Row, Section } from './Media/subcmp';
import { StreamCard } from './Media/Card';
import type { MediaProbe } from '../types/media';
import { librarymanager } from '../lib/platform/library';
import { formatSize } from '../helpers/library';
import { formatBitrate, formatFrameRate } from '../helpers/media';

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
                console.log("Probe", p)
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

    if (!mediaInfoOpen || !media) return null;

    return (
        <aside className="w-[360px] shrink-0 flex flex-col bg-surface border-l border-border animate-slide-in py-1 px-2">
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
                {/*General section*/}
                <Dl>
                    <Row label="Container" value={(probe?.formatLongName || probe?.formatName) as string} />
                    <Row label="Duration" value={fmt(probe?.duration as number)} mono />
                    <Row label="Overall bitrate" value={formatBitrate(probe?.bitRate as number)} mono />
                    <Row label="File size" value={formatSize(probe?.sizeBytes as number)} mono />
                    <Row label="Streams" value={`${probe?.videoStreams.length} video · ${probe?.audioStreams.length} audio · ${probe?.subtitleStreams.length} subtitle`} />
                </Dl>

                {/*Video section — per stream*/}
                {probe?.videoStreams.filter(v => !v.isAttachedPic).map(v => (
                    <StreamCard key={v.index} kind="video" index={v.index} codec={v.codec}>
                        <Row label="Codec" value={`${v.codec}${v.profile ? ` (${v.profile}${v.level ? `@L${v.level}` : ''})` : ''}`} />
                        <Row label="Resolution" value={`${v.width}×${v.height}`} mono />
                        <Row label="Aspect ratio" value={v.displayAspectRatio} mono />
                        <Row label="Frame rate" value={formatFrameRate(v.frameRate)} mono />
                        <Row label="Bitrate" value={formatBitrate(v.bitRate)} mono />
                        <Row label="Pixel format" value={`${v.pixFmt}${v.bitDepth ? ` (${v.bitDepth}-bit)` : ''}`} mono />
                        <Row label="Color" value={`${v.colorSpace || '—'} · ${v.colorTransfer || '—'}`} />
                        {v.language && <Row label="Language" value={v.language} />}
                        {v.title && <Row label="Title" value={v.title} />}
                    </StreamCard>
                ))}

                {/*Audio section — per stream*/}
                {probe?.audioStreams.map(a => (
                    <StreamCard key={a.index} kind="audio" index={a.index} codec={a.codec}>
                        <Row label="Codec" value={`${a.codec}${a.profile ? ` (${a.profile})` : ''}`} />
                        <Row label="Channels" value={`${a.channels}${a.channelLayout ? ` (${a.channelLayout})` : ''}`} mono />
                        <Row label="Sample rate" value={`${a.sampleRate.toLocaleString()} Hz`} mono />
                        {a.bitDepth && <Row label="Bit depth" value={`${a.bitDepth}-bit`} mono />}
                        <Row label="Bitrate" value={formatBitrate(a.bitRate)} mono />
                        {a.language && <Row label="Language" value={a.language.toUpperCase()} />}
                        {a.title && <Row label="Title" value={a.title} />}
                    </StreamCard>
                ))}

                {/*Subtitles section*/}
                {probe?.subtitleStreams.map(s => (
                    <StreamCard key={s.index} kind="subtitle" index={s.index} codec={s.codec}>
                        <Row label="Codec" value={s.codec} />
                        {s.language && <Row label="Language" value={s.language.toUpperCase()} />}
                        {s.title && <Row label="Title" value={s.title} />}
                        {s.isForced && <span className="chip-base">Forced</span>}
                    </StreamCard>
                ))}

                {/*Chapters section (if any)*/}
                {probe && probe.chapters.length > 0 && (
                    <Section title={`Chapters · ${probe?.chapters.length}`}>
                        {probe?.chapters.map(ch => (
                            <div key={ch.id} className="flex items-center gap-2 py-1 text-[11.5px]">
                                <span className="text-text-3 font-mono tabular-nums">{fmt(ch.startSeconds)}</span>
                                <span className="truncate">{ch.title || `Chapter ${ch.id + 1}`}</span>
                            </div>
                        ))}
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



