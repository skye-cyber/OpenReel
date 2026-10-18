import Icon from '../../lib/Icons';
import type { ContextMenuItem } from '../../types/contextmenu';

export function ItemRow({
    entry, onSelect,
}: { entry: ContextMenuItem; onSelect: () => void }) {
    return (
        <>
            {entry.separatorBefore && <div className="h-px bg-border my-1 mx-2" />}
            <button
                role="menuitem"
                onClick={() => { entry.onSelect(); onSelect(); }}
                disabled={entry.disabled}
                className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-sm text-[12.5px] text-left transition-colors ${entry.danger ? 'text-danger hover:bg-danger-dim' : 'text-text hover:bg-hover'} disabled:opacity-40 disabled:pointer-events-none`}
            >
                {entry.icon && <Icon name={entry.icon} size={14} className="text-text-3 shrink-0" />}
                <span className="flex-1 w-full">{entry.label}</span>
                {entry.shortcut && (
                    <span className="text-[11px] text-text-3 font-mono shrink-0">{entry.shortcut}</span>
                )}
            </button>
        </>
    );
}
