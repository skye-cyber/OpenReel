import type { IconName } from "../types";
import { type InputHTMLAttributes, type CSSProperties } from "react";
import Icon from "../lib/Icons";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    icon?: IconName;
    onValue?: (v: string) => void;
    style?: CSSProperties;
}

export function Field({ icon, onValue, style, ...rest }: FieldProps) {
    return (
        <div
            className="flex items-center gap-2 h-[30px] px-2.5 rounded-md bg-surface-2 border border-border-2 text-text-3
        flex-1 min-w-0 transition-colors focus-within:border-accent focus-within:bg-surface"
            style={style}
        >
            {icon && <Icon name={icon} size={14} />}
            <input
                data-search-field
                className="bg-transparent border-0 outline-0 flex-1 min-w-0 text-text text-[12.5px] placeholder:text-text-3"
                onChange={e => onValue?.(e.target.value)}
                {...rest}
            />
        </div>
    );
}
