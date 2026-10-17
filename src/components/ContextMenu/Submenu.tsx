import { useRef, useState } from "react";
import type { ContextMenuSubmenu } from "../../types/contextmenu";
import Icon from "../../lib/Icons";
import { ItemRow } from "./ItemRow";

export function SubmenuRow({ entry }: { entry: ContextMenuSubmenu }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    return (
        <>
            {entry.separatorBefore && <div className="h-px bg-border my-1 mx-2" />}
            <div
                ref={ref}
                className="relative"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                <button
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-sm text-[12.5px]
                     text-left text-text transition-colors hover:bg-hover"
                >
                    {entry.icon && <Icon name={entry.icon} size={14} className="text-text-3 shrink-0" />}
                    <span className="flex-1">{entry.label}</span>
                    <Icon name="chevRight" size={12} className="text-text-3 shrink-0" />
                </button>
                {open && (
                    <div
                        className="absolute left-full top-0 ml-0.5 min-w-[180px] bg-surface border border-border-2
                       rounded-lg shadow-lg p-1 z-310"
                    >
                        {entry.items.map((item, j) => (
                            <ItemRow key={j} entry={item} onSelect={() => setOpen(false)} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
