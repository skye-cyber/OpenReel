import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(
    ref: RefObject<HTMLElement | null>,
    active: boolean
): void {
    useEffect(() => {
        if (!active) return;
        const root = ref.current;
        if (!root) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;

        // Move focus into the trap.
        const focusables = () =>
            Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));

        const first = focusables()[0];
        if (first) {
            first.focus();
        } else {
            // Nothing focusable — focus the container itself.
            root.tabIndex = -1;
            root.focus();
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const items = focusables();
            if (items.length === 0) {
                e.preventDefault();
                return;
            }

            const firstEl = items[0]!;
            const lastEl = items[items.length - 1]!;
            const current = document.activeElement as HTMLElement | null;

            if (e.shiftKey) {
                if (current === firstEl || !root.contains(current)) {
                    e.preventDefault();
                    lastEl.focus();
                }
            } else {
                if (current === lastEl || !root.contains(current)) {
                    e.preventDefault();
                    firstEl.focus();
                }
            }
        };

        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('keydown', onKeyDown, true);
            previouslyFocused?.focus?.();
        };
    }, [ref, active]);
}
