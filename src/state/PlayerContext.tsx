import {
    createContext, useCallback, useEffect, useMemo, useRef, useState,
    type ReactNode,
} from 'react';
import {
    fetchRepository,
} from '../lib/platform/plugins';
import type { AvailableEntry, Repository, RepositoryCatalog } from '../types/plugins';
import type {
    Media, ModalId, Theme, ThemePref, ViewId, Toast, ToastKind, QueueItem,
    PluginActivity,
    Plugin,
    ScanState,
    LibraryMeta
} from '../types';
import { AUDIO, ERROR_MEDIA, VIDEO, QUEUE as QUEUE_SEED, PLUGINS, ERROR_MISSING, ERROR_PERMISSION, ERROR_CORRUPT, ERROR_NO_AUDIO, ERROR_VIDEO_OUT, ERROR_PLUGIN } from '../data/mock';
import { fmt } from '../lib/format';
import { loadPrefs, savePrefs, type PersistedPrefs } from './persistSettings';
import {
    DEFAULT_SETTINGS,
    type Cat,
    type SettingKey,
    type Settings,
} from '../types/settings';
import { Session } from '../lib/platform/session';
import type { PlayerState } from '../types/player';
import { mediaFromQueueItem } from '../helpers/herpers';
import { getMediaInfo } from '../helpers/media';
import {
    DEFAULT_FOLDERS,
    isWatchAvailable,
    scanAll,
    scanOne,
    type Folder,
    type ScanProgress,
    type ScanResult,
} from '../lib/platform/library';
import { pickFolder, labelForFolderPath, idForFolderPath } from '../lib/platform/fs';
import type { AudioTrackInfo, SubtitleTrackInfo } from '../types/mkvSource';
import { CrashHandler } from '../lib/platform/system/Crash';
import type { SafeModeReason } from '../lib/platform/system/shared';
import { PlatformTools } from '../lib/platform/system/tools';


export const PlayerCtx = createContext<PlayerState | null>(null);

function prependActivity(p: Plugin, level: PluginActivity['level'], msg: string): PluginActivity[] {
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return [{ at, level, msg }, ...(p.activity ?? [])].slice(0, 8);
}

interface PlayerProviderProps {
    children: ReactNode;
    initialPrefs: PersistedPrefs;
    initialSafeMode: boolean;
    initialSafeModeReason: SafeModeReason | null;
}

export function PlayerProvider({
    children,
    initialPrefs: prefs,
    initialSafeMode,
    initialSafeModeReason
}: PlayerProviderProps) {
    {
        const [settingCat, setSettingCat] = useState<Cat>('video');
        const [view, setView] = useState<ViewId>('now');
        const [media, setMedia] = useState<Media | null>(null);
        const [playing, _setPlaying] = useState(false);
        const [pos, setPos] = useState(0);
        const [audioTrack, setAudioTrack] = useState(0);
        const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
        const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackInfo[]>([]);
        /*
         -1 means "Off"
         0 means the first subtitle *track (English in the demo)
         1 means the second (German)
         */
        const [subTrack, setSubTrack] = useState(-1);
        const [queue, setQueue] = useState<QueueItem[]>(QUEUE_SEED);
        const [queueIndex, setQueueIndex] = useState(0);
        const [queueOpen, setQueueOpen] = useState(false);
        const [advanced, setAdvanced] = useState(false);
        const [buffering, setBuffering] = useState(false);
        const [offline, setOffline] = useState(false);
        const [modal, setModal] = useState<ModalId>(null);
        const [toasts, setToasts] = useState<Toast[]>([]);
        const [scene, setScene] = useState('empty');
        const [fullscreen, setFullscreen] = useState(false);
        const escapeStackRef = useRef<Array<{ id: string; handler: () => void }>>([]);
        const [urlDialogOpen, setUrlDialogOpen] = useState(false);
        const [mediaInfoOpen, setMediaInfoOpen] = useState(false);
        const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
        const [confirmUninstallId, setConfirmUninstallId] = useState<string | null>(null);
        // const [prefs] = useState(initialPrefs || loadPrefs);  // loads once, never updated
        // A ref to track the current save-loop so we can clear it:
        const saveLoopRef = useRef<number | null>(null);
        const videoRef = useRef<HTMLVideoElement | null>(null);
        // Plugin Repository handling states
        const [repositories, setRepositories] = useState<Repository[]>(prefs.repositories || []);
        const [catalogs, setCatalogs] = useState<RepositoryCatalog[]>([]);
        const [repositoriesLoading, setRepositoriesLoading] = useState(false);
        const [repositoryError, setRepositoryError] = useState<string | null>(null);

        // State
        const [safeMode, setSafeMode] = useState<boolean>(initialSafeMode);
        const [safeModeReason, setSafeModeReason] = useState<SafeModeReason | null>(
            initialSafeModeReason
        );
        // Scanning
        const [scan, setScan] = useState<ScanState | null>(null);
        // Read from prefs, falling back to computed defaults if empty:
        const [libraryMeta, setLibraryMeta] = useState<LibraryMeta>(() => {
            if (prefs.libraryMeta.folders > 0 || prefs.libraryMeta.lastScanAt !== null) {
                return prefs.libraryMeta;
            }
            return {
                folders: DEFAULT_FOLDERS.length,
                itemCount: 0,
                lastScanAt: null,
            };
        });
        // if persisted, use them; otherwise seed from DEFAULT_FOLDERS
        const [folders, setFolders] = useState<Folder[]>(() => {
            if (prefs.libraryFolders.length > 0) {
                return prefs.libraryFolders;
            }
            return DEFAULT_FOLDERS;
        });
        const cancelRef = useRef<() => void>(() => { });

        /*
            The .map() filter is necessary. If a plugin was uninstalled in a previous session, its key is still in the persisted map. The map from PLUGINS (which is the source of installed plugins) skips unknown ids.
        */
        const [plugins, setPlugins] = useState<Plugin[]>(() => {
            const persisted = prefs.plugins ?? {};
            const uninstalled = new Set(prefs.uninstalled ?? []);
            return PLUGINS
                .filter(p => !uninstalled.has(p.id))
                .map(p => (p.id in persisted ? { ...p, on: persisted[p.id]! } : p));
        });

        const [settings, setSettings] = useState<Settings>(() => ({
            ...DEFAULT_SETTINGS,
            ...prefs.settings,
        }));
        const [aboutTab, setAboutTab] = useState<'about' | 'diag' | 'feed'>('about');
        const [themePref, setThemePref] = useState<ThemePref>(prefs.themePref);
        const [vol, _setVol] = useState(prefs.vol || 0.72);
        const [muted, _setMuted] = useState(prefs.muted || false);
        const [speed, _setSpeed] = useState(prefs.speed || 1);
        const [buffered, setBuffered] = useState(0);
        const [liveMessage, setLiveMessage] = useState('');
        const [systemDark, setSystemDark] = useState<boolean>(() => {
            if (typeof window === 'undefined') return true;
            return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
        });
        const theme: Theme =
            themePref === 'system'
                ? (systemDark ? 'dark' : 'light')
                : themePref;
        const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
            if (typeof window === 'undefined' || !window.matchMedia) return false;
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        });

        const reducedMotion =
            settings.reducedMotion === 'system'
                ? systemReducedMotion
                : settings.reducedMotion === 'on';

        const setSetting = useCallback(<K extends SettingKey>(key: K, value: Settings[K]) => {
            setSettings(prev => ({ ...prev, [key]: value }));
        }, []);

        const isChanged = useCallback(
            <K extends SettingKey>(key: K) => settings[key] !== DEFAULT_SETTINGS[key],
            [settings]
        );

        const resetSetting = useCallback(<K extends SettingKey>(key: K) => {
            setSettings(prev => ({ ...prev, [key]: DEFAULT_SETTINGS[key] }));
        }, []);

        const resetAllSettings = useCallback(() => {
            setSettings(DEFAULT_SETTINGS);
        }, []);

        const updateMediaDuration = useCallback((seconds: number) => {
            setMedia(m => m ? { ...m, dur: seconds } : m);
        }, []);

        useEffect(() => {
            if (libraryMeta.lastScanAt !== null) return;
            const t = setTimeout(() => { void startScan(); }, 400);
            return () => clearTimeout(t);
            // Intentionally run once. `startScan` is called once and captured.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        useEffect(() => {
            if (typeof window === 'undefined' || !window.matchMedia) return;
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            const onChange = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
            mq.addEventListener('change', onChange);
            return () => mq.removeEventListener('change', onChange);
        }, []);

        // Apply reduced motion to the DOM
        useEffect(() => {
            document.documentElement.setAttribute('data-motion', reducedMotion ? 'reduced' : 'normal');
        }, [reducedMotion]);

        // Persist effect
        useEffect(() => {
            const t = setTimeout(() => {
                const pluginState: Record<string, boolean> = {};
                for (const p of plugins) pluginState[p.id] = p.on;
                savePrefs({
                    v: 1,
                    themePref, vol, muted, speed,
                    plugins: pluginState,
                    settings,
                    libraryMeta,
                    libraryFolders: folders.map(f => ({
                        id: f.id,
                        label: f.label,
                        path: f.path,
                        itemCount: f.itemCount,
                    })),
                    repositories,
                    subTrack,
                });
            }, 300);
            return () => clearTimeout(t);
        }, [
            themePref, vol, muted, speed,
            plugins, settings,
            libraryMeta, folders, repositories,
        ]);
        const announce = useCallback((msg: string) => {
            setLiveMessage(msg);
            // Clear after a moment so the same message can fire again.
            setTimeout(() => setLiveMessage(''), 1000);
        }, [liveMessage]);

        const setPlayingAnnounced = useCallback((p: boolean) => {
            setPlaying(p);
            announce(p ? 'Playing' : 'Paused');
        }, [announce]);

        const setMutedAnnounced = useCallback((m: boolean) => {
            setMuted(m);
            announce(m ? 'Muted' : 'Unmuted');
        }, [announce]);

        const setSpeedAnnounced = useCallback((s: number) => {
            setSpeed(s);
            announce(`Speed ${s}×`);
        }, [announce]);

        const setAudioTrackAnnounced = useCallback((n: number) => {
            setAudioTrack(n);
            const names = ['English', 'German', 'Commentary'];
            announce(`Audio track: ${names[n] ?? `#${n + 1}`}`);
        }, [announce]);

        const setSubTrackAnnounced = useCallback((n: number) => {
            setSubTrack(n);
            announce(n < 0 ? 'Subtitles off' : `Subtitles: ${['English', 'German', 'English (forced)'][n] ?? `#${n + 1}`}`);
        }, [announce]);

        const selectPlugin = useCallback((id: string | null) => {
            if (safeMode) return toast('Exist safeMode first', 'err')
            if (id !== null && !settings.pluginsEnabled) return;
            setSelectedPluginId(id);

            // When leaving the detail, clear any uninstall confirmation.
            if (id === null) setConfirmUninstallId(null);
        }, [settings.pluginsEnabled, safeMode]);

        // pluginsEnabled needs to be enforced at the state layer, not just the view.
        // Otherwise a stray call to setPluginEnabled from a keyboard shortcut or a modal would still work.
        const setPluginEnabled = useCallback((id: string, on: boolean) => {
            if (safeMode) return toast('You are in safeMode - Restart to disable', 'err')
            if (!settings.pluginsEnabled) return;
            setPlugins(prev => prev.map(p => {
                if (p.id !== id) return p;
                if (p.st === 'incompat') return p;
                return { ...p, on };
            }));
        }, [settings.pluginsEnabled, safeMode]);

        // uninstallPlugin — allowed when off, since removing a disabled plugin is legitimate
        const uninstallPlugin = useCallback((id: string) => {
            setPlugins(prev => prev.filter(p => p.id !== id));
            setSelectedPluginId(cur => (cur === id ? null : cur));
            setConfirmUninstallId(null);
        }, []);

        // silent conflict resolution - no-ops when off, since both plugins are off anyway:
        const resolveConflict = useCallback((winnerId: string, loserId: string) => {
            if (safeMode) return toast('Exist safeMode first', 'err')
            if (!settings.pluginsEnabled) return;
            setPlugins(prev => prev.map(p => {
                if (p.id === winnerId) return { ...p, on: true, st: 'ok', activity: prependActivity(p, 'info', 'Enabled — resolved conflict') };
                if (p.id === loserId) return { ...p, on: false, st: 'ok', activity: prependActivity(p, 'warn', 'Disabled — conflict resolved by user') };
                return p;
            }));
        }, []);

        const pushEscapeHandler = useCallback((id: string, handler: () => void) => {
            const stack = escapeStackRef.current;
            const existing = stack.findIndex(e => e.id === id);
            if (existing >= 0) stack.splice(existing, 1);
            stack.push({ id, handler });
        }, []);

        const popEscapeHandler = useCallback((id: string) => {
            escapeStackRef.current = escapeStackRef.current.filter(e => e.id !== id);
        }, []);

        const runTopEscape = useCallback((): boolean => {
            const top = escapeStackRef.current[escapeStackRef.current.length - 1];
            if (top) {
                top.handler();
                return true;
            }
            return false;
        }, []);

        useEffect(() => {
            const onChange = () => {
                const isFs = !!document.fullscreenElement;
                setFullscreen(isFs);
                announce(isFs ? 'Fullscreen entered' : 'Fullscreen exited');
            };
            document.addEventListener('fullscreenchange', onChange);
            return () => document.removeEventListener('fullscreenchange', onChange);
        }, []);

        useEffect(() => {
            document.documentElement.setAttribute('data-density', settings.density);
        }, [settings.density]);

        useEffect(() => {
            document.documentElement.setAttribute('data-theme', theme);
        }, [theme]);

        useEffect(() => {
            if (typeof window === 'undefined' || !window.matchMedia) return;
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
            mq.addEventListener('change', onChange);
            return () => mq.removeEventListener('change', onChange);
        }, []);

        const toast = useCallback((msg: string, kind: ToastKind = 'ok') => {
            const id = Math.random().toString(36).slice(2);
            setToasts(t => [...t, { id, msg, kind }]);
            setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4200);
        }, []);

        const dismissToast = useCallback((id: string) => {
            setToasts(t => t.filter(x => x.id !== id));
        }, []);

        const hasMedia = !!media && media.kind !== 'error';
        const dur = media?.dur ?? 0;

        const LOOKAHEAD = 0.15;

        // Keep buffered at least pos + LOOKAHEAD, capped at 1.
        // Runs on every pos change, which is fine — it's a cheap Math.max.
        useEffect(() => {
            setBuffered(b => Math.max(b, Math.min(pos + LOOKAHEAD, 1)));
        }, [pos]);

        const setPlaying = useCallback((p: boolean) => {
            const v = videoRef.current;
            if (!v) {
                // No element yet. Update state so the UI reflects intent —
                // this covers the pre-element window and the audio-only stage.
                _setPlaying(p);
                return;
            }
            if (p) {
                // Playback start is asynchronous. If the browser blocks autoplay
                // (no user gesture yet), the promise rejects and state stays paused.
                // That's correct — the icon reflects reality, not intent.
                v.play().catch(() => {
                    _setPlaying(false);
                });
            } else {
                v.pause();
            }
        }, []);

        const setSpeed = useCallback((s: number) => {
            _setSpeed(s);
            const v = videoRef.current;
            if (v) v.playbackRate = s;
        }, []);

        const setVol = useCallback((v: number) => {
            _setVol(v);
            const el = videoRef.current;
            if (el) el.volume = Math.min(Math.max(v, 0), 1);
        }, []);

        const setMuted = useCallback((m: boolean) => {
            _setMuted(m);
            const el = videoRef.current;
            if (el) el.muted = m;
        }, []);

        const seekTo = useCallback((n: number) => {
            const clamped = Math.min(Math.max(n, 0), 1);
            setPos(clamped);
            setBuffered(clamped);
            const v = videoRef.current;
            if (v && Number.isFinite(v.duration) && v.duration > 0) {
                v.currentTime = clamped * v.duration;
            }
        }, []);

        //*    Seeking
        const seekBy = useCallback((deltaSeconds: number) => {
            const v = videoRef.current;
            if (v && Number.isFinite(v.duration) && v.duration > 0) {
                const next = Math.min(Math.max(v.currentTime + deltaSeconds, 0), v.duration);
                v.currentTime = next;
                setPos(next / v.duration);
                setBuffered(next / v.duration);
                return;
            }
            // Fallback for the audio stage and pre-element window.
            if (!hasMedia || dur === 0) return;
            setPos(p => {
                const next = Math.min(Math.max(p + deltaSeconds / dur, 0), 1);
                setBuffered(next);
                return next;
            });
        }, [hasMedia, dur]);

        /* --------------------------------------------------------
         *    Media loading
         *    -------------------------------------------------------- */
        const posRef = useRef(pos);
        const durRef = useRef(dur);
        const mediaRef = useRef(media);
        posRef.current = pos;
        durRef.current = dur;
        mediaRef.current = media;

        const playMedia = useCallback((m: Media) => {
            // Save the outgoing item's position before we replace it.
            const oldMedia = mediaRef.current;
            const oldPos = posRef.current;
            const oldDur = durRef.current;

            if (oldMedia && settings.resumeEnabled && oldDur > 0) {
                const seconds = oldPos * oldDur;
                if (seconds >= settings.resumeThreshold) {
                    Session.set(oldMedia.title, seconds);
                }
            }
            setScene(m.kind === 'audio' ? 'audio' : 'video');

            setMedia(m);
            setView('now');
            const saved = Session.get(m.id);
            const shouldResume =
                settings.resumeEnabled &&
                saved !== undefined &&
                saved >= settings.resumeThreshold &&
                m.dur > 0 &&
                saved < m.dur * 0.95;   // don't resume within the last 5% — the user is probably near the end and wants to finish

            // Defer to the element via requestAnimationFrame so React has
            // committed the new src before we try to seek and play.
            requestAnimationFrame(() => {
                const v = videoRef.current;

                if (v) {
                    if (shouldResume && saved !== undefined) {
                        v.currentTime = saved;
                        toast(`Resuming at ${fmt(saved)}`);
                    } else {
                        v.currentTime = 0;
                    }
                    void v.play().catch(() => {/**/});
                } else {
                    // No element (audio stage, or video element not yet mounted).
                    // Fall back to state-only seek.
                    seekTo(shouldResume && saved !== undefined ? saved / m.dur : 0);
                    _setPlaying(false);
                }
            });
        }, [setMedia, setView, seekTo, toast, settings.resumeEnabled, settings.resumeThreshold]);

        const registerVideoElement = useCallback((el: HTMLVideoElement | null) => {
            videoRef.current = el;
            if (el) {
                // Sync element properties to current state on registration.
                el.volume = Math.min(Math.max(vol, 0), 1);
                el.muted = muted;
                el.playbackRate = speed;
            }
        }, [vol, muted, speed]);

        const takeSnapshot = useCallback(() => {
            if (!hasMedia) return;
            const t = fmt(pos * dur);
            toast(`Snapshot saved at ${t} — JPEG 1920×1080`);
        }, [hasMedia, pos, dur, toast]);


        // Save loop — a useEffect keyed on playing, media, and the setting
        useEffect(() => {
            if (!settings.resumeEnabled) return;
            if (!playing || !media || dur === 0) return;

            const tick = () => {
                const seconds = posRef.current * dur;
                if (seconds >= settings.resumeThreshold) {
                    Session.set(media.id, seconds);
                }
            };

            // Save every 5 seconds while playing.
            saveLoopRef.current = window.setInterval(tick, 5000);

            // Also save on pause (which fires this cleanup).
            return () => {
                if (saveLoopRef.current !== null) {
                    window.clearInterval(saveLoopRef.current);
                    saveLoopRef.current = null;
                }
                // The effect cleans up on pause, so save the current position now.
                if (playing) tick();
            };
        }, [playing, media, dur, settings.resumeEnabled, settings.resumeThreshold]);

        // Clear on completion. When pos reaches ~1.0:
        useEffect(() => {
            if (!media) return;
            if (pos >= 0.999 && media.dur > 0) {
                Session.delete(media.id);
            }
        }, [pos, media]);

        /* --------------------------------------------------------
         *    Queue navigation
         *    -------------------------------------------------------- */
        const playQueueItem = useCallback(async (i: number) => {
            const item = queue[i];
            if (!item || item.bad) {
                if (item?.bad) toast(`Skipped “${item.n}” — unplayable`, 'err');
                return;
            }
            setQueueIndex(i);
            // ses the helper instead of the inline heuristic
            playMedia(await mediaFromQueueItem(item));
        }, [queue, playMedia, toast]);

        const nextItem = useCallback(() => {
            if (queue.length === 0) return;
            for (let step = 1; step <= queue.length; step++) {
                const i = (queueIndex + step) % queue.length;
                const candidate = queue[i];
                if (candidate && !candidate.bad) {
                    playQueueItem(i);
                    return;
                }
            }
            toast('No playable items in queue', 'err');
        }, [queue, queueIndex, playQueueItem, toast]);

        const prevItem = useCallback(() => {
            if (queue.length === 0) return;
            // Restart current item if we're more than set duration=3s in.
            if (settings.previousRestartsCurrent && pos * dur > 3) {
                setPos(0);
                return;
            }
            for (let step = 1; step <= queue.length; step++) {
                const i = (queueIndex - step + queue.length) % queue.length;
                const candidate = queue[i];
                if (candidate && !candidate.bad) {
                    playQueueItem(i);
                    return;
                }
            }
        }, [queue, queueIndex, playQueueItem, pos, dur, toast, settings.previousRestartsCurrent]);

        // Scan runner — one function that both startScan and addFolderFromPicker share
        const runScan = useCallback(async (
            targets: Folder[],
            scanFn: (onProgress: (p: ScanProgress) => void, isCancelled: () => boolean) => Promise<ScanResult | { items: number; cancelled: boolean }>,
        ) => {
            let cancelled = false;
            cancelRef.current = () => { cancelled = true; };

            setScan({
                inProgress: true,
                itemsFound: 0,
                itemsExpected: 0,
                currentFolder: targets[0]?.label ?? '',
                startedAt: Date.now(),
            });

            try {
                const result = await scanFn(
                    p => setScan(prev => prev ? {
                        ...prev,
                        itemsFound: p.itemsFound,
                        itemsExpected: p.itemsExpected,
                        currentFolder: p.currentFolder,
                    } : prev),
                    () => cancelled,
                ) as ScanResult;

                setScan(null);
                setLibraryMeta(prev => ({
                    ...prev,
                    lastScanAt: result.cancelled ? prev.lastScanAt : Date.now(),
                }));

                if (result.cancelled) {
                    toast('Scan cancelled — partial results kept');
                } else {
                    const count = (result.itemsFound !== undefined) ? result.itemsFound : '-'
                    toast(`Scanned ${targets.length} folder${targets.length === 1 ? '' : 's'} · ${count} items`);
                }
            } catch (err) {
                console.error(err)
                setScan(null);
                toast(`Scan failed: ${err}`, 'err');
            }
        }, [toast]);

        useEffect(() => {
            setLibraryMeta(prev => ({
                ...prev,
                folders: folders.length,
                itemCount: folders.reduce((n, f) => n + f.itemCount, 0),
            }));
        }, [folders]);

        // Public scan actions:
        // PS1
        const startScan = useCallback(() => {
            if (scan?.inProgress) return;
            void runScan(folders, (onProgress, isCancelled) => scanAll(folders, onProgress, isCancelled));
        }, [folders, scan, runScan]);

        // PS2
        const cancelScan = useCallback(() => {
            cancelRef.current();
        }, []);
        // PS3
        const addFolderFromPicker = useCallback(async () => {
            if (scan?.inProgress) {
                toast('Wait for the current scan to finish', 'err');
                return;
            }

            const path = await PlatformTools.pickFolder();
            if (path === null) return;   // user cancelled

            const id = idForFolderPath(path);

            // Re-adding the same folder is a no-op.
            if (folders.some(f => f.id === id || f.path === path)) {
                toast('That folder is already in the library', 'err');
                return;
            }

            const label = labelForFolderPath(path);
            // const itemCount = PlatformTools.scanFolder(path, onProgress)
            const folder: Folder = {
                id,
                label,
                path,
                itemCount: 0,
            };

            setFolders(prev => [...prev, folder]);

            await runScan([folder], (onProgress, isCancelled) =>
                scanOne(folder, onProgress, isCancelled),
            );
            console.log("SCAN:", folder, folders)
        }, [scan, folders, toast, runScan]);

        const removeFolder = useCallback((folderId: string) => {
            if (scan?.inProgress) {
                toast('Wait for the current scan to finish', 'err');
                return;
            }

            setFolders(prev => {
                const next = prev.filter(f => f.id !== folderId);
                // Update libraryMeta to match.
                setLibraryMeta(meta => ({
                    ...meta,
                    folders: next.length,
                }));
                return next;
            });

            toast('Folder removed from library');
        }, [scan, toast]);

        const removeLibrary = useCallback(() => {
            if (scan?.inProgress) {
                toast('Wait for the current scan to finish', 'err');
                return;
            }

            setFolders([]);
            setLibraryMeta({ folders: 0, itemCount: 0, lastScanAt: null });
            toast('Library removed');
        }, [scan, toast]);

        // Repository actions
        const addRepository = useCallback((repo: Repository) => {
            setRepositories(prev => {
                if (prev.some(r => r.id === repo.id)) return prev;
                return [...prev, repo];
            });
        }, []);

        const removeRepository = useCallback((repoId: string) => {
            setRepositories(prev => prev.filter(r => r.id !== repoId));
            setCatalogs(prev => prev.filter(c => c.repository.id !== repoId));
        }, []);

        const refreshRepositories = useCallback(async () => {
            if (!settings.pluginNetwork) {
                setRepositoryError('Plugin network access is disabled in Settings → Privacy');
                return;
            }
            if (repositories.length === 0) return;
            setRepositoriesLoading(true);
            setRepositoryError(null);
            try {
                const results = await Promise.allSettled(
                    repositories.map(r => fetchRepository(r)),
                );
                const nextCatalogs: RepositoryCatalog[] = [];
                const errors: string[] = [];
                results.forEach((r, i) => {
                    const repo = repositories[i];
                    if (!repo) return;
                    if (r.status === 'fulfilled') nextCatalogs.push(r.value);
                    else errors.push(`${repo.label}: ${String(r.reason)}`);
                });
                setCatalogs(nextCatalogs);
                if (errors.length > 0) setRepositoryError(errors.join('; '));
            } catch (err) {
                setRepositoryError(String(err));
            } finally {
                setRepositoriesLoading(false);
            }
        }, [repositories, settings.pluginNetwork]);

        // A derived list of available entries - computed inline in the context but memoized
        const availableEntries = useMemo<AvailableEntry[]>(() => {
            const out: AvailableEntry[] = [];
            for (const catalog of catalogs) {
                for (const rp of catalog.plugins) {
                    const installed = plugins.find(p =>
                        p.id === rp.id || p.n === rp.name
                    );
                    out.push({
                        ...rp,
                        repositoryId: catalog.repository.id,
                        repositoryLabel: catalog.repository.label,
                        installed: !!installed,
                        installedVersion: installed?.v,
                    });
                }
            }
            return out;
        }, [catalogs, plugins]);

        // Install from a repository entry
        const installFromRepository = useCallback((entry: AvailableEntry) => {
            if (safeMode) return toast('You are in safeMode restart to exist', 'err')
            if (!settings.pluginsEnabled) {
                toast('Plugins are turned off — enable them first', 'err');
                return;
            }
            if (!settings.pluginNetwork && entry.permissions.includes('network')) {
                toast('This plugin needs network access. Enable it in Settings → Privacy.', 'err');
                return;
            }
            if (!entry.compatibility.ok) {
                toast(`Can't install: ${entry.compatibility.reason ?? 'incompatible'}`, 'err');
                return;
            }

            if (entry.installed) {
                toast(`${entry.name} is already installed`, 'err');
                return;
            }

            const newPlugin: Plugin = {
                id: entry.id,
                n: entry.name,
                p: entry.provider,
                v: entry.version,
                c: entry.category,
                d: entry.description,
                long: entry.longDescription,
                homepage: entry.homepage,
                on: false,   // newly-installed plugins start disabled — user enables
                st: 'ok',
                signed: entry.signed,
                apiVersion: entry.apiVersion,
                size: entry.size,
                installPath: `~/.local/share/openreel/plugins/${entry.id.replace(':', '-')}`,
                permissions: entry.permissions,
                hooks: entry.hooks,
                activity: [
                    {
                        at: new Date().toTimeString().slice(0, 8),
                        level: 'info',
                        msg: `Installed from ${entry.repositoryLabel} (v${entry.version})`,
                    },
                ],
            };

            setPlugins(prev => [...prev, newPlugin]);
            toast(`Installed ${entry.name}`);
        }, [settings.pluginsEnabled, toast, safeMode]);

        // Auto-refresh on add
        // auto-fetch on mount respects pluginUpdateChecks and pluginNetwork
        const prevRepoIdsRef = useRef<string>('');
        useEffect(() => {
            const currentIds = repositories.map(r => r.id).sort().join(',');
            if (currentIds === prevRepoIdsRef.current) return;
            prevRepoIdsRef.current = currentIds;
            if (repositories.length === 0) return;
            if (!settings.pluginUpdateChecks || !settings.pluginNetwork) return;
            void refreshRepositories();
        }, [repositories, settings.pluginUpdateChecks, settings.pluginNetwork, refreshRepositories]);

        // Safemode/recovery actions:
        const enterSafeMode = useCallback((reason: SafeModeReason = 'user') => {
            CrashHandler.enterSafeMode(reason);
            setSafeMode(true);
            setSafeModeReason(reason);
        }, []);

        const exitSafeModeAndReload = useCallback(() => {
            CrashHandler.exitSafeMode();
            setSafeMode(false);
            setSafeModeReason(null);
            window.location.reload();
        }, []);

        /* --------------------------------------------------------
         *    Scene switcher
         *    -------------------------------------------------------- */
        const applyScene = useCallback((id: string) => {
            setScene(id);
            setModal(null);
            setAdvanced(false);
            setOffline(false);
            setBuffering(false);
            setPlaying(false);
            setPos(0);

            switch (id) {
                case 'welcome': setView('welcome'); setMedia(null); setQueueOpen(false); break;
                case 'empty': setView('now'); setMedia(null); setQueueOpen(false); break;
                case 'open': setView('open'); setMedia(null); setQueueOpen(false); break;
                case 'video': setView('now'); setMedia(VIDEO); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'audio': setView('now'); setMedia(AUDIO); setPlaying(true); setPos(0.31); setQueueOpen(false); break;
                case 'tracks': setView('now'); setMedia(VIDEO); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'queue': setView('now'); setMedia(VIDEO); setPlaying(true); setPos(0.28); setQueueOpen(true); break;
                case 'library': setView('library'); setMedia(VIDEO); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'settings': setView('settings'); setMedia(VIDEO); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'plugins': setView('plugins'); setMedia(null); setQueueOpen(false); break;
                case 'install': setView('plugins'); setMedia(null); setModal('install'); setQueueOpen(false); break;
                case 'error': setView('now'); setMedia(ERROR_MEDIA); setQueueOpen(false); break;
                case 'shortcuts': setView('shortcuts'); setMedia(VIDEO); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'about': setView('about'); setMedia(VIDEO); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'loading': setView('now'); setMedia(VIDEO); setPlaying(true); setBuffering(true); setPos(0.28); setQueueOpen(false); break;
                case 'offline': setView('now'); setMedia(VIDEO); setPlaying(true); setOffline(true); setPos(0.28); setQueueOpen(false); break;
                // Error Cases
                case 'error-missing': setView('now'); setMedia(ERROR_MISSING); setQueueOpen(false); break;
                case 'error-permission': setView('now'); setMedia(ERROR_PERMISSION); setQueueOpen(false); break;
                case 'error-corrupt': setView('now'); setMedia(ERROR_CORRUPT); setQueueOpen(false); break;
                case 'error-no-audio': setView('now'); setMedia(ERROR_NO_AUDIO); setQueueOpen(false); break;
                case 'error-video-out': setView('now'); setMedia(ERROR_VIDEO_OUT); setQueueOpen(false); break;
                case 'error-plugin': setView('now'); setMedia(ERROR_PLUGIN); setQueueOpen(false); break;
                default: break;
            }
        }, []);

        const toggleFullscreen = useCallback(async () => {
            try {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                } else if (hasMedia) {
                    const el = document.getElementById('openreel-stage');
                    if (el) await el.requestFullscreen();
                }
            } catch (err) {
                toast('Fullscreen is not available', 'err');
            }
        }, [hasMedia, toast]);

        const syncPlayingFromElement = _setPlaying;
        const watchAvailable = useMemo(() => isWatchAvailable(), []);
        /* --------------------------------------------------------
         *    Memoized context value
         *    -------------------------------------------------------- */
        const value = useMemo<PlayerState>(() => ({
            // theme
            theme, themePref, setThemePref,
            // routing
            view, setView,
            // media
            media, playMedia, setMedia, hasMedia,
            // transport
            playing, setPlaying, syncPlayingFromElement, pos, dur, setPos, vol, setVol, muted, setMuted,
            speed, setSpeed, audioTrack, setAudioTrack, subTrack, setSubTrack,
            // queue
            queue, setQueue, queueIndex, playQueueItem, nextItem, prevItem,
            // panels
            queueOpen, setQueueOpen, advanced, setAdvanced,
            // status
            buffering, setBuffering, offline, setOffline,
            // modals
            modal, setModal,
            // toasts
            toasts, toast, dismissToast,
            // scenes
            scene, applyScene,
            // seeking
            seekBy,
            // fullscreen
            fullscreen, toggleFullscreen, setFullscreen,
            // escape stack
            pushEscapeHandler, popEscapeHandler, runTopEscape,
            // plugins (from 2.2)
            plugins, setPluginEnabled, uninstallPlugin, resolveConflict,
            selectedPluginId, selectPlugin,
            confirmUninstallId, setConfirmUninstallId, takeSnapshot,
            // Reduced motion
            reducedMotion,
            //About
            aboutTab, setAboutTab,
            //
            seekTo, buffered, setBuffered,
            // Anouncements
            setPlayingAnnounced, setMutedAnnounced, setSpeedAnnounced,
            setAudioTrackAnnounced, setSubTrackAnnounced,
            liveMessage, setLiveMessage, announce,
            settings, setSetting, isChanged, resetSetting, resetAllSettings,
            // Setting Category
            settingCat, setSettingCat,
            // Url dialog
            urlDialogOpen, setUrlDialogOpen,
            // Media info
            mediaInfoOpen, setMediaInfoOpen, getMediaInfo,
            // Scanning
            libraryMeta, scan, startScan, cancelScan,
            // Plugin repository
            availableEntries, addRepository, removeRepository, refreshRepositories, installFromRepository,
            repositories, catalogs, repositoriesLoading, repositoryError,
            // Folder management
            addFolderFromPicker, removeFolder, removeLibrary, folders,
            registerVideoElement, updateMediaDuration, watchAvailable,
            audioTracks, subtitleTracks, setSubtitleTracks, setAudioTracks,
            // Crash
            exitSafeModeAndReload, enterSafeMode, safeMode, safeModeReason
        }), [
            // ---- Must mirror the value object field-for-field ----
            theme, themePref, systemDark,
            view,
            media, hasMedia,
            playing, pos, dur, vol, muted, speed, audioTrack, subTrack,
            queue, queueIndex,
            queueOpen, advanced,
            buffering, offline,
            modal,
            toasts,
            scene,
            fullscreen,
            plugins, selectedPluginId, confirmUninstallId, aboutTab,
            // ---- Callbacks ----
            _setPlaying, _setMuted, _setSpeed, _setVol,
            playMedia, playQueueItem, nextItem, prevItem,
            applyScene, toast, dismissToast, seekBy,
            toggleFullscreen, setFullscreen,
            pushEscapeHandler, popEscapeHandler, runTopEscape,
            setPluginEnabled, uninstallPlugin, resolveConflict, selectPlugin, setThemePref,
            buffered, setBuffered,
            settings, setSetting, isChanged, resetSetting, resetAllSettings,
            // Anouncements
            setPlayingAnnounced, setMutedAnnounced, setSpeedAnnounced, setAudioTrackAnnounced,
            setSubTrackAnnounced, liveMessage, setLiveMessage, announce,
            // Setting Category
            settingCat, setSettingCat,
            // url dg
            urlDialogOpen, setUrlDialogOpen,
            // Media info
            mediaInfoOpen, setMediaInfoOpen,
            // Scanning
            libraryMeta, scan, startScan, cancelScan,
            // Plugin repository
            availableEntries, addRepository, removeRepository, refreshRepositories, installFromRepository,
            repositories, catalogs, repositoriesLoading, repositoryError,
            // Folder management
            addFolderFromPicker, removeFolder, removeLibrary, folders,
            registerVideoElement, updateMediaDuration, watchAvailable,
            audioTracks, subtitleTracks, setSubtitleTracks, setAudioTracks,
            // Crash
            exitSafeModeAndReload, enterSafeMode, safeMode, safeModeReason
        ]);

        return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
    }
}
