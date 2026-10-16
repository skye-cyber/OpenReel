interface SegOption<T extends string> { v: T; l: string }
interface SegProps<T extends string> {
    options: readonly SegOption<T>[];
    value: T;
    onChange: (v: T) => void;
}

export function Seg<T extends string>({ options, value, onChange }: SegProps<T>) {
    return (
        <div className="inline-flex bg-surface-3 rounded-md p-0.5 gap-0.5">
            {options.map(o => (
                <button
                    key={o.v}
                    type="button"
                    onClick={() => onChange(o.v)}
                    className={`px-2.5 py-1 rounded-sm text-[12px] font-[550] transition-colors
                ${o.v === value
                            ? 'bg-surface text-text font-semibold shadow-sm'
                            : 'text-text-2 hover:text-text'}`}
                >
                    {o.l}
                </button>
            ))}
        </div>
    );
}
