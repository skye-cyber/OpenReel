type Filter = 'all' | 'enabled' | 'disabled' | 'attention';

export function EmptyState({ query, filter }: { query: string; filter: Filter }) {
    const hasQuery = query.trim().length > 0;
    const hasFilter = filter !== 'all';

    const message = (() => {
        if (hasQuery && hasFilter) return <>No plugins match “{query}” in this filter.</>;
        if (hasQuery) return <>No plugins match “{query}”.</>;
        if (filter === 'enabled') return <>No plugins are currently enabled.</>;
        if (filter === 'disabled') return <>No plugins are installed but disabled.</>;
        if (filter === 'attention') return <>Nothing needs your attention. All good.</>;
        return <>No plugins installed.</>;
    })();

    return (
        <div className="py-10 text-center text-[12.5px] text-text-2 select-none">
            {message}
        </div>
    );
}
