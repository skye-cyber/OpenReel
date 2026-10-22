import { type Settings } from '../types/settings';
import type { ThemePref, LibraryMeta, Plugin } from '../types';
import type { Repository } from './plugins';
import type { Folder } from '../types';

export interface PersistedPrefs {
    v: 1;
    themePref: ThemePref;
    vol: number;
    muted: boolean;
    speed: number;
    plugins: Plugin[];
    settings: Partial<Settings>;
    libraryMeta: LibraryMeta;
    libraryFolders: Folder[];
    repositories: Repository[];
    subtitleTrack?: number;
    recentIds: string[];
}
