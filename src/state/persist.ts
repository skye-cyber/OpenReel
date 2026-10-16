import type { ThemePref } from '../types';

const KEY = 'openreel.prefs.v1';

export interface PersistedPrefs {
    v: 1;
    themePref: ThemePref;
    vol: number;
    muted: boolean;
    speed: number;
    plugins: Record<string, boolean>;
}

export const DEFAULT_PREFS: PersistedPrefs = {
    v: 1,
    themePref: 'system',
    vol: 0.72,
    muted: false,
    speed: 1,
    plugins: {},
};

export function loadPrefs(): PersistedPrefs {
    if (typeof window === 'undefined') return DEFAULT_PREFS;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return DEFAULT_PREFS;
        const parsed = JSON.parse(raw) as Partial<PersistedPrefs>;
        if (parsed.v !== 1) return DEFAULT_PREFS;
        return {
            v: 1,
            themePref: isThemePref(parsed.themePref) ? parsed.themePref : DEFAULT_PREFS.themePref,
            vol: isFiniteNumber(parsed.vol) ? clamp01(parsed.vol) : DEFAULT_PREFS.vol,
            muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_PREFS.muted,
            speed: isFiniteNumber(parsed.speed) ? clamp(parsed.speed, 0.25, 4) : DEFAULT_PREFS.speed,
            plugins: isBooleanMap(parsed.plugins) ? parsed.plugins : {},
        };
    } catch {
        return DEFAULT_PREFS;
    }
}

export function savePrefs(p: PersistedPrefs): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(KEY, JSON.stringify(p));
    } catch {
        // Storage unavailable or full.
    }
}

export function clearPrefs(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.removeItem(KEY);
    } catch {
        // Ignore.
    }
}

/* ---------- helpers ---------- */
function isThemePref(x: unknown): x is ThemePref {
    return x === 'system' || x === 'light' || x === 'dark';
}
function isFiniteNumber(x: unknown): x is number {
    return typeof x === 'number' && Number.isFinite(x);
}
function isBooleanMap(x: unknown): x is Record<string, boolean> {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
    return Object.values(x as Record<string, unknown>).every(v => typeof v === 'boolean');
}
function clamp(n: number, lo: number, hi: number): number {
    return Math.min(Math.max(n, lo), hi);
}
function clamp01(n: number): number {
    return clamp(n, 0, 1);
}
