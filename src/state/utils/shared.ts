import type { PersistedPrefs } from "../../types/persists";

export const DEFAULT_PREFS: PersistedPrefs = {
    v: 1,
    themePref: 'system',
    vol: 0.72,
    muted: false,
    speed: 1,
    plugins: [],
    settings: {},
    libraryMeta: { folders: 0, itemCount: 0, lastScanAt: null },
    libraryFolders: [],
    repositories: [],
    recentIds: [],
    subtitleTrack: 0,
};
