import { invoke } from '@tauri-apps/api/core';
import { clamp, clamp01 } from '../helpers/persist';
import { isFiniteNumber, isBooleanMap, isThemePref, validateSettings, validateLibraryMeta, validateLibraryFolders, validateRepositories, validateRecentIds } from './utils/validator';
import { DEFAULT_PREFS } from './utils/shared';
import { isTauri } from '../lib/platform/system/shared';
import type { PersistedPrefs } from '../types/persists';

const BROWSER_KEY = 'openreel.prefs.v1';


function validate(raw: Partial<PersistedPrefs>): PersistedPrefs {
    return {
        v: 1,
        themePref: isThemePref(raw.themePref) ? raw.themePref : DEFAULT_PREFS.themePref,
        vol: isFiniteNumber(raw.vol) ? clamp01(raw.vol) : DEFAULT_PREFS.vol,
        muted: typeof raw.muted === 'boolean' ? raw.muted : DEFAULT_PREFS.muted,
        speed: isFiniteNumber(raw.speed) ? clamp(raw.speed, 0.25, 4) : DEFAULT_PREFS.speed,
        plugins: isBooleanMap(raw.plugins) ? raw.plugins : [],
        settings: validateSettings(raw.settings),
        libraryMeta: validateLibraryMeta(raw.libraryMeta),
        libraryFolders: validateLibraryFolders(raw.libraryFolders),
        repositories: validateRepositories(raw.repositories),
        subTrack: isFiniteNumber(raw.subTrack) ? Math.round(raw.subTrack) : -1,
        recentIds: validateRecentIds(raw.recentIds ?? []),
    };
}

/* ============================================================
 *  Save queue — serialize writes so they don't overlap
 *  ============================================================ */

let saveChain: Promise<void> = Promise.resolve();

function queueSave(data: PersistedPrefs): Promise<void> {
    saveChain = saveChain.then(async () => {
        try {
            await invoke('write_settings', { data });
        } catch (err) {
            console.error('[persist] write_settings failed', err);
        }
    });
    return saveChain;
}

/* ============================================================
 *  Public API
 *  ============================================================ */

export async function loadPrefs(): Promise<PersistedPrefs> {
    if (typeof window === 'undefined') return DEFAULT_PREFS;

    if (isTauri) {
        try {
            const data = await invoke<unknown>('read_settings');
            if (!data || typeof data !== 'object') return DEFAULT_PREFS;
            const parsed = data as Partial<PersistedPrefs>;
            if (parsed.v !== 1) return DEFAULT_PREFS;
            return validate(parsed);
        } catch (err) {
            console.error('[persist] read_settings failed', err);
            return DEFAULT_PREFS;
        }
    }

    // Browser fallback.
    try {
        const raw = window.localStorage.getItem(BROWSER_KEY);
        if (!raw) return DEFAULT_PREFS;
        const parsed = JSON.parse(raw) as Partial<PersistedPrefs>;
        if (parsed.v !== 1) return DEFAULT_PREFS;
        return validate(parsed);
    } catch {
        return DEFAULT_PREFS;
    }
}

export async function savePrefs(p: PersistedPrefs): Promise<void> {
    if (typeof window === 'undefined') return;

    if (isTauri) {
        return queueSave(p);
    }

    try {
        window.localStorage.setItem(BROWSER_KEY, JSON.stringify(p));
    } catch {
        // Storage unavailable or full.
    }
}

export async function clearPrefs(): Promise<void> {
    if (typeof window === 'undefined') return;

    if (isTauri) {
        try {
            // Overwrite with defaults — there's no delete command yet.
            // await invoke('reset_settings', { data: { v: 0 } });
            await invoke('reset_settings');
        } catch { /* ignore */ }
        return;
    }

    try {
        window.localStorage.removeItem(BROWSER_KEY);
    } catch { /* ignore */ }
}

/**
 * Reset all settings to platform-seeded defaults.
 *
 * In Tauri, calls `reset_settings` which overwrites settings.json with
 * defaults that include the user's actual media folders (~/Videos,
 * ~/Music, etc.) as seeded libraryFolders.
 *
 * In the browser, falls back to clearing localStorage, which causes
 * loadPrefs to return DEFAULT_PREFS on next read.
 */
export async function resetSettings(): Promise<void> {
    if (isTauri) {
        await invoke('reset_settings');
        return;
    }
    await clearPrefs();
}
