import type { Cat } from "../../types/settings";
import { CATS } from "./Shared";
import Icon from "../../lib/Icons";

export function SideNav({
    cat, setCat, disabled,
}: { cat: Cat; setCat: (c: Cat) => void; disabled: boolean }) {
    return (
        <div className="w-[186px] shrink-0 p-4.5 px-2.5 border-r border-border overflow-y-auto">
            {CATS.map(c => {
                const active = cat === c.id && !disabled;
                return (
                    <button
                        key={c.id}
                        onClick={() => !disabled && setCat(c.id)}
                        disabled={disabled}
                        className={`flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] font-medium
                    transition-colors
                    ${active
                                ? 'bg-accent-soft text-text font-semibold'
                                : 'text-text-2 hover:bg-hover hover:text-text'}
            disabled:cursor-default`}
                    >
                        <Icon name={c.icon} size={15} className={active ? 'text-accent' : 'text-text-3'} />
                        {c.l}
                    </button>
                );
            })}
        </div>
    );
}
