import { DEFAULT_PREFS } from './utils/shared';
import type { PersistedPrefs } from '../types/persists';
import {
    isThemePref,
    isFiniteNumber, isBooleanMap,
    validateSettings, validateLibraryMeta,
    validateLibraryFolders, validateRepositories

} from './utils/validator';
import { clamp, clamp01 } from '../helpers/persist';

const KEY = 'openreel.prefs.v1';


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
            settings: validateSettings(parsed.settings),
            libraryMeta: validateLibraryMeta(parsed.libraryMeta),
            libraryFolders: validateLibraryFolders(parsed.libraryFolders),
            repositories: validateRepositories(parsed.repositories),
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
