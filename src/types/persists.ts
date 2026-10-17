import { type Settings } from '../types/settings';
import type { ThemePref, LibraryMeta } from '../types';
import type { Repository } from './plugins';
import type { Folder } from '../lib/platform/library';

export interface PersistedPrefs {
    v: 1;
    themePref: ThemePref;
    vol: number;
    muted: boolean;
    speed: number;
    plugins: Record<string, boolean>;
    settings: Partial<Settings>;
    libraryMeta: LibraryMeta;
    libraryFolders: Folder[];
    repositories: Repository[];
    uninstalled?: string[]
}
