import { useEffect, useMemo } from 'react';
import Icon from '../lib/Icons';
import { usePlayer } from '../hooks/player';
import { fmt } from '../lib/format';
import { Section, Row, Dl } from './Media/subcmp';
import { StreamCard } from './Media/Card';

export function MediaInfo() {
    const {
        media, mediaInfoOpen, setMediaInfoOpen, getMediaInfo,
        pushEscapeHandler, popEscapeHandler,
    } = usePlayer();

    useEffect(() => {
        if (!mediaInfoOpen) return;
        pushEscapeHandler('media-info', () => setMediaInfoOpen(false));
        return () => popEscapeHandler('media-info');
    }, [mediaInfoOpen, setMediaInfoOpen, pushEscapeHandler, popEscapeHandler]);

    const info = useMemo(() => (media ? getMediaInfo(media) : null), [media, getMediaInfo]);

    if (!mediaInfoOpen || !info || !media) return null;

    const videoStreams = info.streams.filter(s => s.kind === 'video');
    const audioStreams = info.streams.filter(s => s.kind === 'audio');
    const subtitleStreams = info.streams.filter(s => s.kind === 'subtitle');

    return (
        <aside className="w-[360px] shrink-0 flex flex-col bg-surface border-l border-border animate-slide-in">
            {/* Header */}
            <div className="flex items-start gap-3 p-3.5 border-b border-border">
                <div className="w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center
                        text-text-3 shrink-0">
                    <Icon name="info" size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <div className="text-[12.5px] font-[650] truncate">Media info</div>
                        <span className="chip-base text-warning border-transparent bg-warning-dim"
                            style={{ height: 16, fontSize: 9.5 }}>
                            Simulated
                        </span>
                    </div>
                    <div className="text-[11px] text-text-3 truncate">{media.title}</div>
                </div>
                <button
                    onClick={() => setMediaInfoOpen(false)}
                    className="w-6 h-6 rounded-sm flex items-center justify-center
                     text-text-3 hover:text-text hover:bg-hover transition-colors shrink-0"
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
                        <Row label="Container" value={info.container} />
                        <Row label="Duration" value={fmt(info.duration)} mono />
                        {info.overallBitrate && <Row label="Overall bitrate" value={info.overallBitrate} mono />}
                        {info.fileSize && <Row label="File size" value={info.fileSize} mono />}
                    </Dl>
                </Section>

                {/* Video */}
                {videoStreams.length > 0 && (
                    <Section title="Video">
                        {videoStreams.map((s, i) => (
                            <StreamCard key={i} stream={s} />
                        ))}
                    </Section>
                )}

                {/* Audio */}
                {audioStreams.length > 0 && (
                    <Section title="Audio">
                        {audioStreams.map((s, i) => (
                            <StreamCard key={i} stream={s} />
                        ))}
                    </Section>
                )}

                {/* Subtitles */}
                {subtitleStreams.length > 0 && (
                    <Section title="Subtitles">
                        {subtitleStreams.map((s, i) => (
                            <StreamCard key={i} stream={s} />
                        ))}
                    </Section>
                )}
            </div>

            <div className="px-3.5 py-2.5 border-t border-border text-[10.5px] text-text-3 leading-snug">
                Stream detail is populated by the media engine. Real values will replace these once the
                backend is connected.
            </div>
        </aside>
    );
}
