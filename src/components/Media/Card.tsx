import type { MediaInfoStream } from '../../types/player';
import Icon from '../../lib/Icons';

export function StreamCard({ stream }: { stream: MediaInfoStream }) {
    const kindIcon = stream.kind === 'video' ? 'film' : stream.kind === 'audio' ? 'music' : 'cc';
    const chips: string[] = [];
    if (stream.default) chips.push('Default');
    if (stream.forced) chips.push('Forced');

    return (
        <div className="mb-2.5 last:mb-0 p-2.5 rounded-md bg-surface-2 border border-border">
            <div className="flex items-center gap-2 mb-2">
                <Icon name={kindIcon} size={13} className="text-text-3 shrink-0" />
                <div className="text-[11.5px] font-semibold">#{stream.index}</div>
                <div className="text-[11.5px] text-text-2 truncate flex-1 min-w-0">
                    {stream.codec}
                </div>
                {chips.map(c => (
                    <span key={c} className="text-[9.5px] font-semibold tracking-wide uppercase px-1.5 py-0.5
                                   rounded-sm bg-accent-dim text-accent">
                        {c}
                    </span>
                ))}
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-x-2 gap-y-0.5 text-[11px]">
                <span className="text-text-3">Spec</span>
                <span className="font-mono tabular-nums">{stream.spec}</span>
                {stream.rate && <>
                    <span className="text-text-3">Rate</span>
                    <span className="font-mono tabular-nums">{stream.rate}</span>
                </>}
                {stream.bitrate && <>
                    <span className="text-text-3">Bitrate</span>
                    <span className="font-mono tabular-nums">{stream.bitrate}</span>
                </>}
                {stream.language && <>
                    <span className="text-text-3">Language</span>
                    <span>{stream.language}{stream.title ? ` · ${stream.title}` : ''}</span>
                </>}
                {stream.extra?.map(e => (
                    <>
                        <span key={e.label + '-l'} className="text-text-3">{e.label}</span>
                        <span key={e.label + '-v'} className="font-mono tabular-nums">{e.value}</span>
                    </>
                ))}
            </div>
        </div>
    );
}
