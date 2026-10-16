import { useState, useRef, type CSSProperties } from "react";
import { clamp01 } from "../lib/format";

interface BarProps {
    value: number;
    onChange: (n: number) => void;
    buffered?: number;
    mini?: boolean;
    style?: CSSProperties;
}

export function Bar({ value, onChange, buffered, mini, style }: BarProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [dragging, setDragging] = useState(false);

    const set = (clientX: number) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        onChange(clamp01((clientX - r.left) / r.width));
    };

    return (
        <div
            ref={ref}
            role="slider"
            aria-valuenow={Math.round(value * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); set(e.clientX); }}
            onPointerMove={e => dragging && set(e.clientX)}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
            style={style}
            className={`group relative rounded-full bg-surface-3 cursor-pointer flex-1 min-w-10 transition-[height]
            ${mini ? 'h-1 hover:h-1' : 'h-[5px] hover:h-[7px]'}`}
        >
            {buffered != null && (
                <div className="absolute inset-y-0 left-0 rounded-full bg-border-2" style={{ width: buffered * 100 + '%' }} />
            )}
            <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: value * 100 + '%' }} />
            <div
                className={`absolute top-1/2 w-3 h-3 rounded-full bg-text shadow-[0_1px_4px_rgba(0,0,0,.5)]
                -translate-x-1/2 -translate-y-1/2 transition-transform
                ${mini ? 'group-hover:scale-100 scale-0' : 'scale-0 group-hover:scale-100'}`}
                style={{ left: value * 100 + '%' }}
            />
        </div>
    );
}
