export function Pill({
    label, onClick, active,
}: { label: string; onClick: () => void; active?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`h-[26px] px-2.5 rounded-sm border text-[11.5px] transition-colors
            ${active
                    ? 'bg-accent-soft border-accent text-accent font-semibold'
                    : 'bg-surface border-border-2 text-text-2 hover:bg-hover hover:text-text hover:border-border-3'}`}
        >
            {label}
        </button>
    );
}
