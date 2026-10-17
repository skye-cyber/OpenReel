import { DEFAULT_SETTINGS, type SettingKey, type Settings, type SubtitleStyle } from '../../types/settings';
import type { ThemePref } from '../../types';
import type { LibraryMeta } from '../../types';
import { DEFAULT_PREFS } from './shared';
import type { PersistedLibraryFolder } from '../../types/persists';
import type { Repository } from '../../types/plugins';


export function isThemePref(x: unknown): x is ThemePref {
    return x === 'system' || x === 'light' || x === 'dark';
}

export function isFiniteNumber(x: unknown): x is number {
    return typeof x === 'number' && Number.isFinite(x);
}

export function isBooleanMap(x: unknown): x is Record<string, boolean> {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
    return Object.values(x as Record<string, unknown>).every(v => typeof v === 'boolean');
}

/**
 * Type-by-template validation: each persisted value must match the typeof of
 * its default. This rejects strings where booleans are expected, numbers where
 * strings are expected, and any unknown keys are ignored.
 */
export function validateSettings(raw: unknown): Partial<Settings> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Partial<Settings> = {};
    for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
        const def = DEFAULT_SETTINGS[key];
        const v = (raw as Record<string, unknown>)[key];
        if (v === undefined) continue;
        if (typeof v !== typeof def) continue;

        // Deep-validate the subtitle style object.
        if (key === 'subtitleStyle') {
            const style = validateSubtitleStyle(v);
            if (style) (out as Record<string, unknown>)[key] = style;
            continue;
        }

        (out as Record<string, unknown>)[key] = v;
    }
    return out;
}

export function validateSubtitleStyle(raw: unknown): SubtitleStyle | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    // const s = DEFAULT_SETTINGS.subtitleStyle;

    if (typeof r.fontSize !== 'number' || r.fontSize < 10 || r.fontSize > 72) return null;
    if (!['regular', 'medium', 'bold'].includes(String(r.fontWeight))) return null;
    if (!['white', 'yellow', 'cyan', 'green', 'magenta', 'red', 'black'].includes(String(r.color))) return null;
    if (!['none', 'thin', 'medium', 'thick'].includes(String(r.outline))) return null;
    if (!['none', 'subtle', 'solid'].includes(String(r.background))) return null;
    if (typeof r.positionFromBottom !== 'number' || r.positionFromBottom < 0 || r.positionFromBottom > 40) return null;

    return {
        fontFamily: 'system',
        fontSize: r.fontSize,
        fontWeight: r.fontWeight as SubtitleStyle['fontWeight'],
        color: r.color as SubtitleStyle['color'],
        outline: r.outline as SubtitleStyle['outline'],
        background: r.background as SubtitleStyle['background'],
        positionFromBottom: r.positionFromBottom,
    };
}

export function validateLibraryMeta(raw: unknown): LibraryMeta {
    if (!raw || typeof raw !== 'object') return DEFAULT_PREFS.libraryMeta;
    const r = raw as Partial<LibraryMeta>;
    return {
        folders: isFiniteNumber(r.folders) ? Math.max(0, r.folders) : 0,
        itemCount: isFiniteNumber(r.itemCount) ? Math.max(0, r.itemCount) : 0,
        lastScanAt: isFiniteNumber(r.lastScanAt) ? r.lastScanAt : null,
    };
}

export function validateLibraryFolders(raw: unknown): PersistedLibraryFolder[] {
    if (!Array.isArray(raw)) return [];
    const out: PersistedLibraryFolder[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        if (typeof e.id !== 'string' || typeof e.label !== 'string' || typeof e.path !== 'string') continue;
        const itemCount = isFiniteNumber(e.itemCount) ? Math.max(0, e.itemCount) : 0;
        out.push({ id: e.id, label: e.label, path: e.path, itemCount });
    }
    return out;
}

export function validateRepositories(raw: unknown): Repository[] {
    if (!Array.isArray(raw)) return [];
    const out: Repository[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const e = entry as Record<string, unknown>;
        if (typeof e.id !== 'string' || typeof e.label !== 'string' || typeof e.url !== 'string') continue;
        out.push({
            id: e.id,
            label: e.label,
            url: e.url,
            lastFetchedAt: isFiniteNumber(e.lastFetchedAt) ? e.lastFetchedAt : null,
        });
    }
    return out;
}
