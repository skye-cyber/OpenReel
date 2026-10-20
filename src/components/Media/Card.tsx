import Icon from '../../lib/Icons';
import { Row } from './subcmp';


export function StreamCard({
    kind, index, codec, spec, extra,
}: {
    kind: 'video' | 'audio';
    index: number;
    codec: string;
    spec: string;
    extra?: Array<{ label: string; value: string }>;
}) {
    const kindIcon = kind === 'video' ? 'film' : 'music';
    return (
        <div className="p-2.5 rounded-md bg-surface-2 border border-border">
            <div className="flex items-center gap-2 mb-2">
                <Icon name={kindIcon} size={13} className="text-text-3 shrink-0" />
                <div className="text-[11.5px] font-semibold">#{index}</div>
                <div className="text-[11.5px] text-text-2 truncate flex-1 min-w-0">{codec}</div>
            </div>
            <div className="grid grid-cols-[92px_1fr] gap-x-2 gap-y-0.5 text-[11px]">
                <span className="text-text-3">Spec</span>
                <span className="font-mono tabular-nums">{spec}</span>
                {extra?.map(e => (
                    <Row key={e.label} label={e.label} value={e.value} />
                ))}
            </div>
        </div>
    );
}
