export interface ContextMenuItem {
    kind?: 'item';
    label: string;
    icon?: keyof typeof import('../lib/Icons').paths;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    separatorBefore?: boolean;
    onSelect: () => void;
}

export interface ContextMenuSubmenu {
    kind: 'submenu';
    label: string;
    icon?: keyof typeof import('../lib/Icons').paths;
    separatorBefore?: boolean;
    items: ContextMenuItem[];
}

export interface ContextMenuSeparator {
    kind: 'separator';
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSubmenu | ContextMenuSeparator;

export interface ContextMenuPosition {
    x: number;
    y: number;
}


export interface ContextMenuProps {
    position: ContextMenuPosition;
    entries: ContextMenuEntry[];
    onClose: () => void;
}

export type ContextMenuPayload = unknown;

export const FOCUSABLE = 'button:not([disabled]), [tabindex]:not([tabindex="-1"])';
