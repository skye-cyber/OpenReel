import { type CSSProperties, type ReactNode } from 'react';
import Icon from '../lib/Icons';
import type { IconName } from '../lib/Icons';


type ChipTone = 'ok' | 'warn' | 'err' | 'acc';

interface ChipProps {
    tone?: ChipTone;
    icon?: IconName;
    children: ReactNode;
    style?: CSSProperties;
}

export function Chip({ tone, icon, children, style }: ChipProps) {
    const toneCls =
        tone === 'ok' ? 'text-success border-transparent bg-success-dim' :
            tone === 'warn' ? 'text-warning border-transparent bg-warning-dim' :
                tone === 'err' ? 'text-danger border-transparent bg-danger-dim' :
                    tone === 'acc' ? 'text-accent border-transparent bg-accent-dim' : '';
    return (
        <span className={`chip-base ${toneCls}`} style={style}>
            {icon ? <Icon name={icon} size={11} /> : tone === 'ok' ? <span className="w-1.5 h-1.5 rounded-full bg-current" /> : null}
            {children}
        </span>
    );
}
