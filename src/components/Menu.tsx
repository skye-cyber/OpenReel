import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Icon from "../lib/Icons";
import { usePlayer } from "../hooks/player";

interface MenuItemProps {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    tick?: boolean;
    sub?: string;
}

interface MenuProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    dir?: 'up' | 'down';
    align?: 'left' | 'right';
    className?: string;
}

const FOCUSABLE = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export function Menu({ open, onClose, children, dir = 'up', align = 'right', className }: MenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { pushEscapeHandler, popEscapeHandler } = usePlayer();
    const escapeId = useRef(`menu-${Math.random().toString(36).slice(2)}`).current;
    const triggerRef = useRef<HTMLElement | null>(null);

    // Register on the escape stack.
    useEffect(() => {
        if (!open) return;
        pushEscapeHandler(escapeId, onClose);
        return () => popEscapeHandler(escapeId);
    }, [open, onClose, escapeId, pushEscapeHandler, popEscapeHandler]);

    // Click-away still uses its own listener — Escape is handled by the stack.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mousedown', onDown);
        };
    }, [open, onClose]);


    // Focus management: save trigger on open, focus first item, restore on close.
    useEffect(() => {
        if (!open) return;

        // The trigger is whatever had focus when the menu opened.
        triggerRef.current = document.activeElement as HTMLElement | null;

        // Focus the first item on the next frame so the DOM is settled.
        const raf = requestAnimationFrame(() => {
            const root = ref.current;
            if (!root) return;
            const first = root.querySelector<HTMLElement>(FOCUSABLE);
            if (first) first.focus();
            else {
                root.tabIndex = -1;
                root.focus();
            }
        });

        return () => {
            cancelAnimationFrame(raf);
            // On close, return focus to the trigger if it's still in the DOM.
            const trigger = triggerRef.current;
            if (trigger && document.body.contains(trigger)) {
                trigger.focus();
            }
        };
    }, [open]);

    // Arrow navigation inside the menu.
    useEffect(() => {
        if (!open) return;
        const root = ref.current;
        if (!root) return;

        const onKey = (e: KeyboardEvent) => {
            const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
                .filter(el => el.offsetParent !== null);  // skip hidden
            if (items.length === 0) return;

            const current = document.activeElement as HTMLElement | null;
            const idx = current ? items.indexOf(current) : -1;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items[idx < items.length - 1 ? idx + 1 : 0]!.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                items[idx > 0 ? idx - 1 : items.length - 1]!.focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                items[0]!.focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                items[items.length - 1]!.focus();
            }
        };

        root.addEventListener('keydown', onKey);
        return () => root.removeEventListener('keydown', onKey);
    }, [open]);

    if (!open) return null;

    const posCls = dir === 'down' ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+10px)]';
    const alignCls = align === 'right' ? 'right-0' : 'left-0';
    return (
        <div
            ref={ref}
            className={`absolute min-w-[210px] bg-surface border border-border-2 rounded-lg shadow-lg p-1 z-200
            animate-menu-in ${posCls} ${alignCls} ${className ?? ''}`}
            style={{ transformOrigin: dir === 'down' ? 'top right' : 'bottom right' }}
        >
            {children}
        </div>
    );
}
export function MenuItem({ children, onClick, disabled, tick, sub }: MenuItemProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-sm text-[12.5px] text-text text-left transition-colors hover:bg-hover disabled:opacity-40 disabled:pointer-events-none"
        >
            {children}
            {sub && <span className="text-[11px] text-text-3 ml-auto pl-3.5">{sub}</span>}
            {tick && <span className="ml-auto text-accent"><Icon name="check" size={14} /></span>}
        </button>
    );
}

export const MenuHead = ({ children }: { children: ReactNode }) => (
    <div className="text-[10px] font-bold tracking-[.08em] uppercase text-text-3 px-2.5 pt-1.5 pb-1">
        {children}
    </div>
);

export const MenuSep = () => <div className="h-px bg-border my-1 mx-2" />;
