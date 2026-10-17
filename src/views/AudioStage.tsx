import { Chip } from '../components/Chip';
import { usePlayer } from "../hooks/player";
import type { AudioMedia } from '../types';
import { WAVE } from '../lib/format';
import { fmt } from '../lib/format';

export function AudioStage({ media }: { media: AudioMedia }) {
    const { pos, setPos } = usePlayer();
    const played = Math.round(pos * WAVE.length);

    return (
        <div className="min-h-full flex items-center justify-center p-11 px-6 relative
        before:content-[''] before:absolute before:inset-0 before:pointer-events-none
        before:bg-[radial-gradient(560px_340px_at_50%_30%,var(--color-accent-soft),transparent_72%)]">
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
                    onClick={e => {
                        const r = e.currentTarget.getBoundingClientRect();
                        setPos(Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1));
                    }}
                >
                    {WAVE.map((v, i) => (
                        <i
                            key={i}
                            className={`flex-1 rounded-[2px] min-h-[3px] transition-[background,opacity]
                ${i < played ? 'bg-accent opacity-95' : 'bg-text-3 opacity-35 group-hover:opacity-60'}`}
                            style={{ height: v * 100 + '%' }}
                        />
                    ))}
                </div>

                <div className="flex justify-between w-full text-[11px] text-text-3 tabular-nums mb-5">
                    <span>{fmt(pos * media.dur)}</span>
                    <span>−{fmt((1 - pos) * media.dur)}</span>
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
