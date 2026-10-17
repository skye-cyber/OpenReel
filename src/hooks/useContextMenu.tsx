import {
    useCallback, useState,
    type MouseEvent as ReactMouseEvent,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { ContextMenuPosition } from "../types/contextmenu";

export function useContextMenu<T>() {
    const [state, setState] = useState<{ position: ContextMenuPosition; payload: T } | null>(null);

    const open = useCallback(
        (e: ReactMouseEvent | ReactKeyboardEvent, payload: T) => {
            e.preventDefault();
            e.stopPropagation();

            let x: number;
            let y: number;

            if ('clientX' in e && (e.clientX !== 0 || e.clientY !== 0)) {
                x = e.clientX;
                y = e.clientY;
            } else {
                const target = e.currentTarget as HTMLElement | null;
                if (target) {
                    const r = target.getBoundingClientRect();
                    x = r.left + Math.min(r.width / 2, 120);
                    y = r.top + Math.min(r.height / 2, 40);
                } else {
                    x = window.innerWidth / 2;
                    y = window.innerHeight / 2;
                }
            }

            setState({ position: { x, y }, payload });
        },
        []
    );

    const close = useCallback(() => setState(null), []);

    return { state, open, close };
}
