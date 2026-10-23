export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface BrowserSafeModeFlag {
    active: boolean;
    reason: SafeModeReason;
    activatedAt: number;
}

export interface SessionState {
    cleanExit: boolean;
    recentCrashes: number[];
}

export type SafeModeReason = 'user' | 'crash';
