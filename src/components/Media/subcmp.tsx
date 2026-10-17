export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="border-b border-border last:border-b-0">
            <div className="px-3.5 pt-3 pb-1 text-[10px] font-bold tracking-[.09em] uppercase text-text-3">
                {title}
            </div>
            <div className="px-3.5 pb-3">{children}</div>
        </div>
    );
}

export function Dl({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-[110px_1fr] gap-x-3">{children}</div>;
}

export function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <>
            <div className="text-[11.5px] text-text-3 py-1 truncate">{label}</div>
            <div className={`text-[11.5px] py-1 truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</div>
        </>
    );
}
