import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../../hooks/player';
import type { ContextMenuProps } from '../../types/contextmenu';
import { FOCUSABLE } from '../../types/contextmenu';
import { SubmenuRow } from '../ContextMenu/Submenu';
import { ItemRow } from '../ContextMenu/ItemRow';


export function ContextMenu({ position, entries, onClose }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    const { pushEscapeHandler, popEscapeHandler } = usePlayer();
    const escapeId = useRef(`ctxmenu-${Math.random().toString(36).slice(2)}`).current;

    // Register with the escape stack — Escape closes only this menu.
    useEffect(() => {
        pushEscapeHandler(escapeId, onClose);
        return () => popEscapeHandler(escapeId);
    }, [escapeId, onClose, pushEscapeHandler, popEscapeHandler]);

    // Restore focus on unmount.
    useEffect(() => {
        triggerRef.current = document.activeElement as HTMLElement | null;
        return () => {
            const t = triggerRef.current;
            if (t && document.body.contains(t)) t.focus();
        };
    }, []);

    // Focus first item on open.
    useEffect(() => {
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
        return () => cancelAnimationFrame(raf);
    }, []);

    // Click-away, scroll, and resize all close.
    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const onScroll = () => onClose();
        const onResize = () => onClose();
        const onContext = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const t = setTimeout(() => {
            document.addEventListener('mousedown', onDown);
            document.addEventListener('contextmenu', onContext);
            window.addEventListener('scroll', onScroll, true);
            window.addEventListener('resize', onResize);
        }, 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('contextmenu', onContext);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [onClose]);

    // Arrow navigation.
    useEffect(() => {
        const root = ref.current;
        if (!root) return;
        const onKey = (e: KeyboardEvent) => {
            const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
                .filter(el => el.offsetParent !== null);
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
    }, []);

    // Clamp to viewport after measuring.
    const [adjusted, setAdjusted] = useState(position);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const pad = 8;
        const overflowX = r.right + pad > window.innerWidth;
        const overflowY = r.bottom + pad > window.innerHeight;
        setAdjusted({
            x: overflowX ? Math.max(pad, window.innerWidth - r.width - pad) : position.x,
            y: overflowY ? Math.max(pad, window.innerHeight - r.height - pad) : position.y,
        });
    }, [position]);

    return (
        <div
            ref={ref}
            role="menu"
            className="fixed min-w-[200px] bg-surface border border-border-2 rounded-lg shadow-lg p-1 z-300
                 animate-menu-in"
            style={{ left: adjusted.x, top: adjusted.y, transformOrigin: 'top left' }}
        >
            {entries.map((entry, i) => {
                if (entry.kind === 'separator') {
                    return <div key={i} className="h-px bg-border my-1 mx-2" />;
                }
                if (entry.kind === 'submenu') {
                    return <SubmenuRow key={i} entry={entry} />;
                }
                return <ItemRow key={i} entry={entry} onSelect={onClose} />;
            })}
        </div>
    );
}

