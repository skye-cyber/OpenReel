import { type ButtonHTMLAttributes, } from 'react';
import Icon from '../lib/Icons';
import type { IconName } from '../types';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconName;
    active?: boolean;
    size?: number;
    big?: boolean;
    title: string;
}

type ButtonVariant = 'default' | 'primary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: 'sm' | 'md';
    icon?: IconName;
}

export function Button({ variant = 'default', size = 'md', icon, children, className, ...rest }: ButtonProps) {
    const classes = [
        'btn-base', 'btn-hover',
        variant === 'primary' && 'bg-accent border-transparent text-[#1a0f08] font-[650] hover:bg-accent-hi',
        variant === 'ghost' && 'bg-transparent border-transparent text-text-2 hover:bg-hover hover:text-text',
        size === 'sm' && 'h-[26px] px-2.5 text-[12px]',
        className,
    ].filter(Boolean).join(' ');
    return (
        <button className={classes} {...rest}>
            {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
            {children}
        </button>
    );
}

export function IconButton({ icon, active, size = 17, big, title, className, ...rest }: IconButtonProps) {
    const classes = [
        'ibtn-base', 'ibtn-hover',
        big && 'w-9 h-9',
        active && 'text-accent bg-accent-soft',
        className,
    ].filter(Boolean).join(' ');
    return (
        <button className={classes} title={title} aria-label={title} {...rest}>
            <Icon name={icon} size={size} />
        </button>
    );
}
