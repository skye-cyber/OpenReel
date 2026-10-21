export type Theme = 'dark' | 'light';
export type ThemePref = Theme | 'system';

export type ViewId =
    | 'welcome'
    | 'now'
    | 'library'
    | 'settings'
    | 'plugins'
    | 'shortcuts'
    | 'about';

export type MediaKind = 'video' | 'audio' | 'error';

/** A folder indexed by the library. */
export interface Folder {
    /** Stable id, derived from the path (see `idForFolderPath` in fs.ts). */
    id: string;
    /** Absolute filesystem path. Must be resolvable — no `~` shorthand. */
    path: string;
    /** Display label — usually the folder's basename. */
    label: string;
    /** Cached item count from the last scan. 0 until first scan. */
    itemCount: number;
}

export interface VideoMedia {
    kind: 'video';
    id: string;
    url: string;
    title: string;
    sub: string;
    dur: number;
    codec: string;
}

export interface AudioMedia {
    kind: 'audio';
    id: string;
    url: string;
    title: string;
    artist: string;
    album: string;
    year: number;
    dur: number;
    meta: string;
}

export interface ErrorMedia {
    kind: 'error';
    id: string;
    title: string;
    dur: number;
    reason: ErrorReason;
    detail?: string;
    pluginName?: string;
    codec: string;
    url?: string
}

export type ErrorReason =
    | 'unsupported-codec'
    | 'file-missing'
    | 'permission-denied'
    | 'corrupt-file'
    | 'no-audio-device'
    | 'video-output-failure'
    | 'plugin-crashed';

export interface ErrorMedia {
    kind: 'error';
    id: string;
    title: string;
    dur: number;
    reason: ErrorReason;
    /** Free-form detail — codec name, plugin id, OS error string. */
    detail?: string;
    /** When reason is 'plugin-crashed', names the plugin. */
    pluginName?: string;
    /** The underlying codec/container line, shown as monospace. */
    codec: string;
}

export type Media = VideoMedia | AudioMedia | ErrorMedia;

export interface RecentItem {
    n: string;
    p: string;
    d: string;
    k: 'video' | 'audio';
}

export interface OpenFileRow {
    n: string;
    p: string;
    t: string;
    s: string;
    m: string;
    d: string;
    k: 'video' | 'audio' | 'file';
}

export interface LibraryRow {
    t: string;
    p: string;
    d: string;
    f: string;
    a: string;
    pl: number;
    missing?: boolean;
}

export interface QueueItem {
  /** Stable key — the media id. Used for dedupe. */
  id: string;
  /** The full media object. */
  media: Media;
  /** When this item was added, epoch ms. Used for "added" ordering if needed. */
  addedAt: number;
}

export type PluginStatus = 'ok' | 'conflict' | 'failed' | 'incompat';


export interface Scene {
    id: string;
    l: string;
}

export type ToastKind = 'ok' | 'err';

export interface Toast {
    id: string;
    msg: string;
    kind?: ToastKind;
}

export type ModalId = 'install' | null;

export interface IconProps {
    name: IconName;
    size?: number;
    weight?: number;
    className?: string;
    style?: React.CSSProperties;
}

export type IconName = keyof typeof import('./lib/Icons').paths;


export type PluginPermissionId =
    | 'network'
    | 'read-media'
    | 'write-config'
    | 'spawn'
    | 'audio-output'
    | 'draw-overlay';

export interface PluginPermission {
    id: PluginPermissionId;
    /** Plain-language statement in the "will be able to" tense. */
    grant: string;
    /** Plain-language statement in the "can" tense, for the installed view. */
    held: string;
    risk: 'Low' | 'Medium' | 'High';
}

export interface PluginActivity {
    at: string;        // "14:02:11"
    level: 'info' | 'warn' | 'error';
    msg: string;
}

export interface Plugin {
    id: string;
    name: string;
    provider: string;              // provider
    version: string;              // version
    category: string;              // category
    description: string;              // one-line description
    long?: string;          // paragraph-length description for the detail view
    homepage?: string;      // URL opened in the system browser
    on: boolean;
    status: PluginStatus;
    err?: string;
    /** Permission IDs this plugin declares. */
    permissions?: PluginPermissionId[];
    /** Whether the install signature verified. */
    signed?: boolean;
    /** Hooks the plugin registers — used for conflict detection. */
    hooks?: string[];
    /** Recent activity, most recent first. */
    activity?: PluginActivity[];
    /** Install path, shown in the uninstall confirmation. */
    installPath?: string;
    /** Size on disk, human-formatted. */
    size?: string;
    /** Plugin API version the plugin targets. */
    apiVersion?: string;
}

export interface ScanState {
    inProgress: boolean;
    itemsFound: number;
    itemsExpected: number;
    currentFolder: string;
    startedAt: number;
}

export interface LibraryMeta {
    folders: number;
    itemCount: number;
    lastScanAt: number | null;
}

export interface ScanProgress {
    itemsFound: number,
    itemsExpected: number,
    currentFolder: string,
}

export interface AudioDevice {
    id: string,
    name: string,
    isDefault: string,
}

export interface DragDropPayload {
  paths: string[];   // absolute filesystem paths
  position: { x: number; y: number };  // screen coordinates of the drop
}
