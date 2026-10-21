import type {
    Theme, ThemePref, Media,
    ViewId, ModalId, Toast,
    ToastKind, Plugin, QueueItem,
    ScanState,
    LibraryMeta,
    Folder
} from "../types";
import type { Settings, SettingKey, Cat } from "./settings";
import type { Repository, RepositoryCatalog, AvailableEntry } from "./plugins";
import type { AudioTrackInfo, SubtitleTrackInfo } from "./mkvSource";
import type { SafeModeReason } from "../lib/platform/system/shared";
import type { PersistedPrefs } from "./persists";
import type { MediaProbe } from "./media";


export interface MediaInfoStream {
    kind: 'video' | 'audio' | 'subtitle';
    index: number;
    codec: string;
    /** e.g. "1920×1080", "5.1", "stereo" */
    spec: string;
    /** e.g. "23.976 fps", "48 kHz", "—" */
    rate?: string;
    /** e.g. "4 512 kbps", "—" */
    bitrate?: string;
    language?: string;
    title?: string;
    default?: boolean;
    forced?: boolean;
    /** Extra key/value pairs for video specifics. */
    extra?: Array<{ label: string; value: string }>;
}

export interface MediaInfo {
    container: string;
    duration: number;
    overallBitrate?: string;
    fileSize?: string;
    streams: MediaInfoStream[];
}

export interface PlayerState {
    theme: Theme;
    themePref: ThemePref;
    setThemePref: (t: ThemePref) => void;

    view: ViewId;
    setView: (v: ViewId) => void;

    media: Media | null;
    playMedia: (m: Media) => void;
    playMediaInternal: (m: Media, source: 'direct' | 'queue') => void;
    setMedia: (m: Media | null) => void;
    hasMedia: boolean;

    playing: boolean;
    setPlaying: (p: boolean) => void;
    syncPlayingFromElement: (p: boolean) => void;  // raw, used by element events

    pos: number;
    dur: number;
    setPos: (n: number) => void;

    vol: number;
    setVol: (n: number) => void;
    muted: boolean;
    setMuted: (b: boolean) => void;

    speed: number;
    setSpeed: (n: number) => void;

    audioTrack: number;
    setAudioTrack: (n: number) => void;
    subTrack: number;
    setSubTrack: (n: number) => void;

    queue: QueueItem[];
    queueIndex: number;
    playQueueItem: (i: number) => void;
    nextItem: () => void;
    prevItem: () => void;

    queueOpen: boolean;
    setQueueOpen: (b: boolean) => void;

    advanced: boolean;
    setAdvanced: (b: boolean) => void;

    buffering: boolean;
    setBuffering: (b: boolean) => void;

    offline: boolean;
    setOffline: (b: boolean) => void;

    modal: ModalId;
    setModal: (m: ModalId) => void;

    toasts: Toast[];
    toast: (msg: string, kind?: ToastKind) => void;
    dismissToast: (id: string) => void;

    scene: string;
    applyScene: (id: string) => void;

    seekBy: (deltaSeconds: number) => void;

    takeSnapshot: () => void;

    fullscreen: boolean;
    toggleFullscreen: () => void;
    setFullscreen: (v: boolean) => void;

    pushEscapeHandler: (id: string, handler: () => void) => void;
    popEscapeHandler: (id: string) => void;
    runTopEscape: () => boolean;

    selectedPluginId: string | null;
    selectPlugin: (id: string | null) => void;

    plugins: Plugin[];
    setPluginEnabled: (id: string, on: boolean) => void;
    uninstallPlugin: (id: string) => void;
    resolveConflict: (winnerId: string, loserId: string) => void;

    confirmUninstallId: string | null;
    setConfirmUninstallId: (id: string | null) => void;

    reducedMotion: boolean;

    aboutTab: 'about' | 'diag' | 'feed';
    setAboutTab: (a: 'about' | 'diag' | 'feed') => void;

    buffered: number;
    setBuffered: (b: number) => void;
    seekTo: (n: number) => void;

    // Anouncements
    setPlayingAnnounced: (p: boolean) => void;
    setMutedAnnounced: (m: boolean) => void;
    setSpeedAnnounced: (s: number) => void;
    setAudioTrackAnnounced: (n: number) => void;
    setSubTrackAnnounced: (n: number) => void;
    liveMessage: string;
    setLiveMessage: (ms: string) => void;

    settings: Settings;
    setSetting: <K extends SettingKey>(key: K, value: Settings[K]) => void;
    isChanged: <K extends SettingKey>(key: K) => boolean;
    resetSetting: <K extends SettingKey>(key: K) => void;
    resetAllSettings: () => void;

    settingCat: Cat;
    setSettingCat: (cat: Cat) => void;

    urlDialogOpen: boolean;
    setUrlDialogOpen: (v: boolean) => void;

    mediaInfoOpen: boolean;
    setMediaInfoOpen: (v: boolean) => void;
    getMediaInfo: (media: Media) => Promise<MediaProbe | null>;
    mediaInfoCache: Map<string, MediaProbe>;  // optional, if you want to share


    scan: ScanState | null;
    startScan: () => void;
    cancelScan: () => void;

    libraryMeta: LibraryMeta;

    repositories: Repository[];
    catalogs: RepositoryCatalog[];
    repositoriesLoading: boolean;
    repositoryError: string | null;

    availableEntries: AvailableEntry[];
    addRepository: (repo: Repository) => void;
    removeRepository: (id: string) => void;
    refreshRepositories: () => Promise<void>;
    installFromRepository: (entry: AvailableEntry) => void;

    addFolderFromPicker: () => Promise<void>;
    removeFolder: (id: string) => void;
    removeLibrary: () => void;
    folders: Folder[]

    registerVideoElement: (el: HTMLVideoElement | null) => void;
    updateMediaDuration: (d: number) => void;

    watchAvailable: boolean;

    audioTracks: AudioTrackInfo[];
    subtitleTracks: SubtitleTrackInfo[];
    setAudioTracks: (t: AudioTrackInfo[]) => void;
    setSubtitleTracks: (t: SubtitleTrackInfo[]) => void;

    // Crash session
    safeMode: boolean;
    safeModeReason: SafeModeReason | null;
    enterSafeMode: (reason: SafeModeReason) => void;
    exitSafeModeAndReload: () => void;

    consumePendingPlayback: () => { seek: number | null; play: boolean };
    lastScanId: string | null;
    setLastScanId: (id: string | null) => void;
    //Pref
    prefs: PersistedPrefs;
    //Lib
    libraryIndexReady: boolean;
    setLibraryIndexReady: (s: boolean) => void;

    recentIds: string[];
    clearRecents: () => void;

    openFiles: () => void;
    shuffle: boolean;
    // setShuffle: (s: boolean) => void;
    repeat: 'off' | 'all' | 'one';
    setRepeat: (v: 'off' | 'all' | 'one') => void;
    toggleShuffle: () => void;
    cycleRepeat: () => void;
    removeQueueItem: (index: number) => void;
    clearQueue: () => void;
    queueMoveToTop: (index: number) => void;
    queueMoveNext: (index: number) => void;
    openDroppedFiles: (paths: string[]) => Promise<void>;
}
