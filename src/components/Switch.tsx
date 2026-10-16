interface SwitchProps {
    on: boolean;
    onChange: (v: boolean) => void;
    label: string;
}

export function Switch({ on, onChange, label }: SwitchProps) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={e => { e.stopPropagation(); onChange(!on); }}
            className={`relative w-9 h-5 rounded-full border transition-colors shrink-0
            ${on ? 'bg-accent border-transparent' : 'bg-surface-3 border-border-2'}`}
        >
            <span className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full transition-transform duration-150
                ${on ? 'translate-x-4 bg-[#1a0f08]' : 'bg-text-3'}`} />
        </button>
    );
}
