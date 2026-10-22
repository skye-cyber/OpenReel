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
import { fmt } from '../lib/format';
import {
    DEFAULT_SETTINGS,
    type Cat,
    type SettingKey,
    type Settings,
} from '../types/settings';
import { Session } from '../lib/platform/session';
import type { ABRepeat, PlayerState, Transcode as TranscodeType } from '../types/player';
import { mediaFromPath } from '../helpers/herpers';
import {
    DEFAULT_FOLDERS,
    librarymanager,
} from '../lib/platform/library';
import { labelForFolderPath, idForFolderPath } from '../lib/platform/fs';
import type { ExtractedTracks, TrackInfo } from '../types/mkvSource';
import { CrashHandler } from '../lib/platform/system/Crash';
import { isTauri, type SafeModeReason } from '../lib/platform/system/shared';
import { PlatformTools } from '../lib/platform/system/tools';
import type { PersistedPrefs } from '../types/persists';
import { savePrefs } from './persistSettings';
import type { Folder } from '../types';
import { listen } from '@tauri-apps/api/event';
import type { MediaProbe } from '../types/media';
import { computeNextIndex, computePrevIndex, needsTranscode } from '../helpers/media';
import { prepareTranscode } from '../lib/platform/transcode';
import { toMediaUrl } from '../lib/mediaPath';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';

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

/**
 * **PlayerProvider**\
 T h*e if (transcode && transcode.status !== 'done') gate also prevents playback during a second transcode if the user has multiple HEVC files queued and presses Next. nextItem sets queueIndex to the next item, playMedia runs for that item, needsTranscode returns true, setTranscode starts a new transcode. The effect sees transcode.status === 'running', skips. When the second transcode completes, effect fires. Correct.
 */
export function PlayerProvider({
    children,
    initialPrefs: prefs,
    initialSafeMode,
    initialSafeModeReason
}: PlayerProviderProps) {
    {
        const [settingCat, setSettingCat] = useState<Cat>('video');
        const [view, _setView] = useState<ViewId>('now');
        const [media, _setMedia] = useState<Media | null>(null);
        const [playing, _setPlaying] = useState(false);
        const [pos, setPos] = useState(0);
        const [audioTracks, setAudioTracks] = useState<TrackInfo[]>([]);
        const [subtitleTracks, setSubtitleTracks] = useState<TrackInfo[]>([]);
        const [videoTracks, setVideoTracks] = useState<TrackInfo[]>([]);
        const [selectedAudio, setSelectedAudio] = useState(0);
        const [selectedSubtitle, setSelectedSubtitle] = useState(-1);  // -1 = off
        const [selectedVideo, setSelectedVideo] = useState(0);
        /*
         -1 means "Off"
         0 means the first subtitle *track (English in the demo)
         1 means the second (German)
         */
        const [subTrack, setSubTrack] = useState(-1);
        const [queue, setQueue] = useState<QueueItem[]>([]);
        const queueRef = useRef<QueueItem[]>(queue);
        queueRef.current = queue;
        // queueIndex = -1 means nothing is playing from the queue
        const [queueIndex, setQueueIndex] = useState<number>(-1);
        const [shuffle, setShuffle] = useState(false);
        const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('off');
        // For shuffle: the shuffled order of indices. null when shuffle is off.
        const shuffleOrderRef = useRef<number[] | null>(null);
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
        const [lastScanId, setLastScanId] = useState<string | null>(null)
        const [recentIds, setRecentIds] = useState<string[]>(prefs.recentIds ?? []);
        // State
        const [safeMode, setSafeMode] = useState<boolean>(initialSafeMode);
        const [safeModeReason, setSafeModeReason] = useState<SafeModeReason | null>(
            initialSafeModeReason
        );
        const [abRepeat, setAbRepeat] = useState<ABRepeat>({ a: null, b: null });

        const [sessionAspect, setSessionAspect] = useState<'fit' | 'fill' | 'stretch' | null>(null);
        const _mediaInfoCache = useRef<Map<string, MediaProbe>>(new Map());
        const [transcode, setTranscode] = useState<TranscodeType | null>(null);
        const transcodeInFlightRef = useRef<Set<string>>(new Set());
        const [libraryIndexReady, setLibraryIndexReady] = useState<boolean>(false)
        const pendingSeekRef = useRef<number | null>(null);
        const pendingPlayRef = useRef<boolean>(false);
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
            const _plugins = prefs.plugins ?? [];
            return _plugins
            // return PLUGINS.map(p =>
            //     p.id in persisted ? { ...p, on: persisted[p.id]! } : p
            // );
        });

        const [settings, setSettings] = useState<Settings>(() => ({
            ...DEFAULT_SETTINGS,
            ...prefs.settings,
        }));
        const currentAspect = sessionAspect ?? settings.defaultAspect;

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

        const getMediaInfo = useCallback(async (m: Media): Promise<MediaProbe | null> => {
            if (m.kind === 'error') return null;

            const cached = _mediaInfoCache.current.get(m.id);
            if (cached) return cached;

            try {
                const probe = await librarymanager.probeMediaFile(m.id);
                _mediaInfoCache.current.set(m.id, probe);
                return probe;
            } catch {
                return null;
            }
        }, []);

        const setCurrentAspect = useCallback((aspect: 'fit' | 'fill' | 'stretch') => {
            setSessionAspect(aspect);
        }, []);

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

        const setMedia = useCallback((m: Media | null) => {
            const prev = mediaRef.current;
            _setMedia(m);
            if (m === null) {
                if (scene == "now") setScene('empty');
                setTranscode(null);
                setQueueIndex(-1);  // ← clear the index
                _setPlaying(false);  // ← stop playback
                setPos(0);
                setBuffered(0);
                setTranscode(null);
                // Cancel any in-flight transcode for the outgoing media.
                if (prev && prev.id && transcodeInFlightRef.current.has(prev.id)) {
                    void invoke('cancel_transcode', { path: prev.id }).catch(() => { });
                }
                pendingSeekRef.current = null;
                pendingPlayRef.current = false;
            }
        }, []);

        const updateMediaDuration = useCallback((seconds: number) => {
            if (media) {
                setMedia({ ...media, dur: seconds });
            }
        }, [media, setMedia]);

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
                // const pluginState: Record<string, boolean> = {};
                // for (const p of plugins) pluginState[p.id] = p.on;
                savePrefs({
                    v: 1,
                    themePref, vol, muted, speed,
                    plugins: plugins,
                    settings,
                    libraryMeta,
                    libraryFolders: folders.map(f => ({
                        id: f.id,
                        label: f.label,
                        path: f.path,
                        itemCount: f.itemCount,
                    })),
                    repositories,
                    subtitleTrack: selectedSubtitle,
                    recentIds,
                });
            }, 300);
            return () => clearTimeout(t);
        }, [
            themePref, vol, muted, speed,
            plugins, settings, recentIds,
            libraryMeta, folders, repositories,
        ]);

        const loadMeta = async () => {
            try {
                const meta = await librarymanager.getLibraryMeta();
                setLibraryIndexReady(meta.hasIndex);
                if (meta.hasIndex) {
                    // Update folders with their real counts.
                    setFolders(prev => prev.map(f => ({
                        ...f,
                        itemCount: meta.folderCounts[f.id] ?? f.itemCount,
                    })));
                    // Update libraryMeta with the aggregate.
                    setLibraryMeta({
                        folders: folders.length,
                        itemCount: meta.totalCount,
                        lastScanAt: meta.scannedAt,
                    });
                }
            } catch (err) {
                console.error('[library] load meta failed', err);
            }
        };
        const refreshLibrary = loadMeta

        // On mount, query the current index state:
        useEffect(() => {
            if (!isTauri) return;

            void loadMeta();

            const unlisten = listen('library-index-ready', () => {
                setLibraryIndexReady(true);
                void loadMeta();
            });

            return () => { void unlisten.then(f => f()); };
        }, []);


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
            switchAudioTrack(n);
            const names = ['English', 'German', 'Commentary'];
            announce(`Audio track: ${names[n] ?? `#${n + 1}`}`);
        }, [announce]);

        const setSubTrackAnnounced = useCallback((n: number) => {
            switchSubtitleTrack(n);
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
                if (p.status === 'incompat') return p;
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

        const cycleAbRepeat = useCallback(() => {
            const v = videoRef.current;
            if (!v) return;
            const now = v.currentTime;

            if (abRepeat.a === null) {
                // No A set. Set A at current time.
                setAbRepeat({ a: now, b: null });
                toast(`A–B: A set at ${fmt(now)}`);
            } else if (abRepeat.b === null) {
                // A set, no B. Set B, requiring B > A.
                if (now <= abRepeat.a) {
                    toast('A–B: mark B after A', 'err');
                    return;
                }
                setAbRepeat({ a: abRepeat.a, b: now });
                toast(`A–B: looping ${fmt(abRepeat.a)} → ${fmt(now)}`);
            } else {
                // Both set. Clear.
                setAbRepeat({ a: null, b: null });
                toast('A–B: cleared');
            }
        }, [abRepeat, toast]);

        const hasMedia = !!media && media.kind !== 'error';
        const dur = media?.dur ?? 0;

        const LOOKAHEAD = 0.15;

        const setView = useCallback((v: ViewId) => {
            setScene('empty');

            // Navigating away from Now Playing closes the current media.
            // Without this, the <video> element unmounts (VideoStage disappears)
            // but the context still shows playing:true, media:<file>, pos:<n>.
            // On return, the element remounts paused at 0 while the UI says
            // "playing" — a stuck state.
            if (view === 'now' && v !== 'now' && media !== null) {
                // Save position before clearing, if resume is enabled.
                if (settings.resumeEnabled && media.kind !== 'error' && dur > 0 && pos * dur >= settings.resumeThreshold) {
                    Session.set(media.id, pos * dur);
                }
                _setPlaying(false);
                _setMedia(null);
                setPos(0);
                setBuffered(0);
                setSubTrack(-1);
                // Set tracks to default
                setSelectedVideo(0);
                setSelectedSubtitle(0);
                setSelectedAudio(0);
                setBuffering(false)
                setQueueIndex(-1);
            }

            _setView(v);
        }, [view, media, dur, pos, settings.resumeEnabled, settings.resumeThreshold]);

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

        const clearRecents = useCallback(() => {
            setRecentIds([]);
        }, []);

        /* --------------------------------------------------------
         *    Media loading
         *    -------------------------------------------------------- */
        const posRef = useRef(pos);
        const durRef = useRef(dur);
        const mediaRef = useRef(media);
        posRef.current = pos;
        durRef.current = dur;
        mediaRef.current = media;

        const playMediaInternal = useCallback((m: Media, _source: 'queue' | 'direct') => {
            // Save outgoing item's position before we replace it.
            const oldMedia = mediaRef.current;
            const oldPos = posRef.current;
            const oldDur = durRef.current;

            // Track as recent.
            if (m.kind !== 'error') {
                setRecentIds(prev => {
                    const next = [m.id, ...prev.filter(id => id !== m.id)];
                    return next.slice(0, 10);
                });
            }
            if (oldMedia && settings.resumeEnabled && oldDur > 0) {
                const seconds = oldPos * oldDur;
                if (seconds >= settings.resumeThreshold) {
                    Session.set(oldMedia.id, seconds);
                }
            }

            // Determine resume position for the incoming media.
            const saved = Session.get(m.id);
            const shouldResume =
                settings.resumeEnabled &&
                saved !== undefined &&
                saved >= settings.resumeThreshold &&
                m.dur > 0 &&
                saved < m.dur * 0.95;

            pendingSeekRef.current = shouldResume && saved !== undefined ? saved : 0;
            pendingPlayRef.current = true;

            if (shouldResume && saved !== undefined) {
                toast(`Resuming at ${fmt(saved)}`);
            }

            setMedia(m);
            setView('now');
            setScene(m.kind === 'audio' ? 'audio' : 'video');
        }, [setMedia, setView, settings.resumeEnabled, settings.resumeThreshold, toast]);

        const playMedia = useCallback((m: Media) => {
            const currentQueue = queueRef.current;
            const existingIdx = currentQueue.findIndex(q => q.id === m.id);

            let itemIndex: number;
            if (existingIdx >= 0) {
                itemIndex = existingIdx;
            } else {
                const item: QueueItem = { id: m.id, media: m, addedAt: Date.now() };
                setQueue(prev => [...prev, item]);
                itemIndex = currentQueue.length;
            }

            setQueueIndex(itemIndex);
            playMediaInternal(m, 'direct');

            if (isTauri && needsTranscode(m)) {
                if (!transcodeInFlightRef.current.has(m.id)) {
                    transcodeInFlightRef.current.add(m.id);
                    // No setQueueIndex(0). No itemIndex passed — swap by ID.
                    void runTranscode(m);
                }
            }
        }, [playMediaInternal]);

        // Swap by q.id === m.id. No itemIndex. Every transcode completion targets the correct queue item regardless of position.
        const runTranscode = useCallback(async (m: Media) => {
            setTranscode({
                mediaId: m.id,
                percent: 0, speed: 0, processedSeconds: 0, totalSeconds: 0,
                status: 'running', error: null,
            });

            try {
                const result = await prepareTranscode(m.id, (p) => {
                    setTranscode(prev => prev && prev.mediaId === m.id ? { ...prev, ...p } : prev);
                });
                const outputUrl = await toMediaUrl(result.outputPath);

                setQueue(prev => prev.map(q =>
                    q.id === m.id
                        ? { ...q, media: { ...q.media, url: outputUrl, dur: result.duration } }
                        : q
                ));

                setTranscode(prev => prev && prev.mediaId === m.id
                    ? { ...prev, status: 'done', percent: 1.0 }
                    : prev);

                const tracks = await invoke<ExtractedTracks>('list_extracted_tracks', { path: m.id });
                setAudioTracks(tracks.audio);
                setSubtitleTracks(tracks.subtitles);
                setVideoTracks(tracks.videos);
                // Select first subtitle
                setSelectedSubtitle(0)
            } catch (err) {
                setTranscode(prev => prev && prev.mediaId === m.id
                    ? { ...prev, status: 'error', error: String(err) }
                    : prev);
            } finally {
                transcodeInFlightRef.current.delete(m.id);
            }
        }, []);

        const appendAndPlay = useCallback((media: Media[]) => {
            if (media.length === 0) return;

            const existing = new Set(queue.map(q => q.id));
            const fresh = media.filter(m => !existing.has(m.id));
            if (fresh.length === 0) {
                toast('Those files are already in the queue', 'err');
                return;
            }

            const items: QueueItem[] = fresh.map(m => ({
                id: m.id,
                media: m,
                addedAt: Date.now(),
            }));
            const startIndex = queue.length;
            setQueue(prev => [...prev, ...items]);
            setQueueIndex(startIndex);

            toast(
                fresh.length === 1
                    ? `Added "${fresh[0]!.title}"`
                    : `Added ${fresh.length} files to the queue`,
            );
        }, [queue, toast]);

        const switchAudioTrack = useCallback((index: number) => {
            if (index < 0 || index >= audioTracks.length) return;
            const track = audioTracks[index];
            if (!track) return;

            setSelectedAudio(index);

            const item = queueRef.current[queueIndex];
            if (!item) return;
            if (item.media.url === track.url) return;

            const currentTime = videoRef.current?.currentTime ?? 0;

            setQueue(prev => prev.map(q =>
                q.id === item.id ? { ...q, media: { ...q.media, url: track.url } } : q
            ));

            pendingSeekRef.current = currentTime;
            pendingPlayRef.current = true;
        }, [audioTracks, queueIndex]);

        const switchSubtitleTrack = useCallback((index: number) => {
            // Subtitles are rendered by SubtitleOverlay, not by the <video>
            // element. No media reload, no position save — just update the
            // selection so the overlay resolves the new VTT URL.
            setSelectedSubtitle(index);
        }, []);

        const switchVideoTrack = useCallback((index: number) => {
            if (index < 0 || index >= videoTracks.length) return;
            const track = videoTracks[index];
            if (!track) return;

            setSelectedVideo(index);

            const item = queueRef.current[queueIndex];
            if (!item) return;
            if (item.media.url === track.url) return;

            const currentTime = videoRef.current?.currentTime ?? 0;

            setQueue(prev => prev.map(q =>
                q.id === item.id ? { ...q, media: { ...q.media, url: track.url } } : q
            ));

            pendingSeekRef.current = currentTime;
            pendingPlayRef.current = true;
        }, [videoTracks, queueIndex]);
        const openFiles = useCallback(async () => {
            const paths = await PlatformTools.pickFiles();
            if (!paths || paths.length === 0) return;
            const media = await Promise.all(paths.map(p => mediaFromPath(p)));
            appendAndPlay(media);
        }, [appendAndPlay]);

        const openDroppedFiles = useCallback(async (paths: string[]) => {
            // Filter by extension — dropping a folder or a non-media file should not be silently ignored, but should not try to play either.
            const MEDIA_EXTS = new Set([
                'mkv', 'mp4', 'm4v', 'webm', 'mov', 'avi', 'flv', 'wmv', 'ogv',
                'mp3', 'flac', 'wav', 'm4a', 'aac', 'ogg', 'opus', 'wma',
            ]);
            const mediaPaths = paths.filter(p => {
                const ext = p.split('.').pop()?.toLowerCase() ?? '';
                return MEDIA_EXTS.has(ext);
            });
            if (mediaPaths.length === 0) {
                toast('No media files in the drop', 'err');
                return;
            }
            const media = await Promise.all(mediaPaths.map(p => mediaFromPath(p)));
            appendAndPlay(media);
        }, [appendAndPlay, toast]);

        const consumePendingPlayback = useCallback(() => {
            const seek = pendingSeekRef.current;
            const play = pendingPlayRef.current;
            pendingSeekRef.current = null;
            pendingPlayRef.current = false;
            return { seek, play };
        }, []);

        const registerVideoElement = useCallback((el: HTMLVideoElement | null) => {
            videoRef.current = el;
            if (el) {
                // Sync element properties to current state on registration.
                el.volume = Math.min(Math.max(vol, 0), 1);
                el.muted = muted;
                el.playbackRate = speed;
            }
        }, [vol, muted, speed]);

        const takeSnapshot = useCallback(async () => {
            if (!hasMedia) return;
            const v = videoRef.current;
            if (!v || v.readyState < 2) {
                toast('Video not ready for a snapshot yet', 'err');
                return;
            }
            if (!v.videoWidth || !v.videoHeight) {
                toast('Video dimensions not available', 'err');
                return;
            }

            const canvas = document.createElement('canvas');
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                toast('Could not create snapshot canvas', 'err');
                return;
            }

            try {
                ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            } catch {
                toast('Could not capture frame — the video source may be protected', 'err');
                return;
            }

            const format = settings.snapshotFormat;
            const mime = format === 'png' ? 'image/png'
                : format === 'webp' ? 'image/webp'
                    : 'image/jpeg';
            const quality = format === 'png' ? undefined : 0.92;

            const blob: Blob | null = await new Promise(resolve =>
                canvas.toBlob(resolve, mime, quality)
            );

            if (!blob) {
                toast('Snapshot failed', 'err');
                return;
            }

            const safeTitle = media?.title.replace(/[^\w.-]+/g, '_') ?? 'snapshot';
            const timestamp = fmt(v.currentTime).replace(/:/g, '-');
            const ext = format === 'jpeg' ? 'jpg' : format;
            const defaultName = `${safeTitle}-${timestamp}.${ext}`;

            if (isTauri) {
                const savePath = await save({
                    defaultPath: defaultName,
                    filters: [{ name: format.toUpperCase(), extensions: [ext] }],
                });
                if (!savePath) return; // user cancelled

                const bytes = new Uint8Array(await blob.arrayBuffer());
                await invoke('save_file_bytes', { path: savePath, bytes: Array.from(bytes) });
                toast(`Snapshot saved to ${savePath}`);
            } else {
                // Browser: blob + download anchor.
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = defaultName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast(`Snapshot saved — ${canvas.width}×${canvas.height}`);
            }
        }, [hasMedia, toast, settings.snapshotFormat, media]);


        // syncs media when queueIndex changes
        useEffect(() => {
            if (queueIndex < 0 || queueIndex >= queue.length) return;
            if (media === null) return;  // ← no media means nothing to play
            const item = queue[queueIndex];
            if (!item) return;

            // Compare URLs, not just IDs. The ID stays the source path across
            // the transcode swap; only the URL changes. Comparing only IDs means
            // the effect never re-fires after the swap, `media` keeps the
            // source URL, and the `<video>` element never gets the transcode.
            if (item.media.id !== media?.id || item.media.url !== media?.url) {
                playMediaInternal(item.media, 'queue');
            }
        }, [queueIndex, queue, media?.id, media?.url, playMediaInternal]);

        // Handle library scanning when indexes get updated
        useEffect(() => {
            if (!isTauri) return;
            const unlisten = listen('library-index-ready', () => {
                void refreshLibrary();
            });
            return () => { void unlisten.then(f => f()); };
        }, []);

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
        const playQueueItem = useCallback((i: number) => {
            const item = queue[i];
            if (!item) return;
            if (item.media.kind === 'error') {
                toast(`Can't play "${item.media.title}"`, 'err');
                return;
            }
            setQueueIndex(i);
            playMediaInternal(item.media, 'queue');

            if (isTauri && needsTranscode(item.media) && !transcodeInFlightRef.current.has(item.media.id)) {
                transcodeInFlightRef.current.add(item.media.id);
                void runTranscode(item.media);
            }
        }, [queue, toast, playMediaInternal]);

        const nextItem = useCallback(() => {
            if (queue.length === 0) return;

            if (repeat === 'one' && queueIndex >= 0) {
                // Replay current.
                playMediaInternal(queue[queueIndex]!.media, 'queue');
                return;
            }

            const nextIdx = computeNextIndex(queue.length, queueIndex, shuffle, repeat, shuffleOrderRef.current);
            if (nextIdx === null) {
                // Reached end, repeat off.
                _setPlaying(false);
                return;
            }
            setQueueIndex(nextIdx);
        }, [queue, queueIndex, shuffle, repeat, playMediaInternal]);

        const prevItem = useCallback(() => {
            if (queue.length === 0) return;

            // If past 3 seconds, restart current.
            if (pos * dur > 3) {
                seekTo(0);
                return;
            }

            const prevIdx = computePrevIndex(queue.length, queueIndex, shuffle, repeat, shuffleOrderRef.current);
            if (prevIdx === null) {
                seekTo(0);
                return;
            }
            setQueueIndex(prevIdx);
        }, [queue, queueIndex, pos, dur, seekTo, shuffle, repeat]);

        const rebuildShuffleOrder = useCallback((length: number, currentIndex: number): number[] => {
            const idxs = Array.from({ length }, (_, i) => i);
            // Fisher-Yates.
            for (let i = idxs.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [idxs[i], idxs[j]] = [idxs[j]!, idxs[i]!];
            }
            // Current item at the front so "next" starts from the second.
            if (currentIndex >= 0 && currentIndex < length) {
                const curPos = idxs.indexOf(currentIndex);
                if (curPos > 0) {
                    [idxs[0], idxs[curPos]] = [idxs[curPos]!, idxs[0]!];
                }
            }
            return idxs;
        }, []);

        /**
         * Move a queue item to position 0.
         *
         * If the item is currently playing, the currently-playing item
         * changes position but stays playing (queueIndex updates to match
         * the new location). If the item wasn't playing, playback continues
         * on the current item — the current item's index shifts by +1
         * because a new item was inserted above it.
         */
        const queueMoveToTop = useCallback((index: number) => {
            if (index <= 0 || index >= queue.length) return;

            setQueue(prev => {
                const next = [...prev];
                const [item] = next.splice(index, 1);
                if (!item) return prev;
                next.unshift(item);
                return next;
            });

            setQueueIndex(prev => {
                if (prev === index) return 0;
                if (prev < index) return prev + 1;
                return prev;
            });

            // Rebuild shuffle order if shuffle is on. The current playing index
            // after the move is what we feed to rebuildShuffleOrder.
            if (shuffleOrderRef.current) {
                const newCurrent = queueIndex === index ? 0
                    : queueIndex < index ? queueIndex + 1
                        : queueIndex;
                shuffleOrderRef.current = rebuildShuffleOrder(queue.length, newCurrent);
            }
        }, [queue.length, queueIndex, rebuildShuffleOrder]);

        const queueMoveNext = useCallback((index: number) => {
            if (index < 0 || index >= queue.length) return;

            // The target slot is one past the current playing item.
            // If nothing is playing, target is 0.
            const currentPlaying = queueIndex >= 0 ? queueIndex : -1;
            const targetIndex = currentPlaying >= 0 ? currentPlaying + 1 : 0;

            // If the item is already at the target, no-op.
            if (index === targetIndex) return;
            // If the item is the currently playing item, can't "play it next".
            if (index === currentPlaying) return;
            // If the item is already the next one but the arithmetic broke because
            // moving an earlier item forward shifts things, handle below.

            setQueue(prev => {
                const next = [...prev];
                const [item] = next.splice(index, 1);
                if (!item) return prev;
                // Recompute target after removal — if index < target, target shifts by -1.
                const adjustedTarget = index < targetIndex ? targetIndex - 1 : targetIndex;
                next.splice(adjustedTarget, 0, item);
                return next;
            });

            // Adjust queueIndex.
            setQueueIndex(prev => {
                if (prev === index) return targetIndex - (index < targetIndex ? 1 : 0);
                if (index < targetIndex) {
                    // Moving item from earlier to later.
                    if (prev > index && prev <= targetIndex - 1) return prev - 1;
                    if (prev >= targetIndex) return prev;  // wait, no shift for prev >= targetIndex
                    // prev < index: unaffected
                    return prev;
                } else {
                    // Moving item from later to earlier (index > targetIndex).
                    if (prev >= targetIndex && prev < index) return prev + 1;
                    // prev >= index: index item was removed, so prev decrements by 1,
                    // then insertion at targetIndex shifts it back up by 1 if targetIndex <= prev-1.
                    if (prev > index) return prev;  // net zero
                    return prev;
                }
            });

            // Rebuild shuffle order.
            if (shuffleOrderRef.current) {
                shuffleOrderRef.current = rebuildShuffleOrder(
                    queue.length,
                    // Compute new playing index the same way setQueueIndex will.
                    currentPlaying >= 0 ? currentPlaying : -1,
                );
            }
        }, [queue.length, queueIndex, rebuildShuffleOrder]);

        const clearQueue = useCallback(() => {
            setQueue([]);
            setQueueIndex(-1);
            shuffleOrderRef.current = null;

            // Stop playback.
            _setPlaying(false);
            _setMedia(null);
            setPos(0);
            setBuffered(0);
        }, []);

        const toggleShuffle = useCallback(() => {
            setShuffle(s => {
                const next = !s;
                if (next) {
                    // Generate shuffled order, keeping current item first.
                    const idxs = Array.from({ length: queue.length }, (_, i) => i);
                    // Fisher-Yates shuffle.
                    for (let i = idxs.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [idxs[i], idxs[j]] = [idxs[j]!, idxs[i]!];
                    }
                    // Move current item to the front so "next" starts from the second item.
                    if (queueIndex >= 0) {
                        const curPos = idxs.indexOf(queueIndex);
                        if (curPos > 0) {
                            [idxs[0], idxs[curPos]] = [idxs[curPos]!, idxs[0]!];
                        }
                    }
                    shuffleOrderRef.current = idxs;
                } else {
                    shuffleOrderRef.current = null;
                }
                return next;
            });
        }, [queue.length, queueIndex]);

        const cycleRepeat = useCallback(() => {
            setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off');
        }, []);

        const removeQueueItem = useCallback((index: number) => {
            if (index < 0 || index >= queue.length) return;
            const removingCurrent = index === queueIndex;

            setQueue(prev => prev.filter((_, i) => i !== index));

            // Adjust queueIndex.
            if (removingCurrent) {
                if (queue.length === 1) {
                    // Last item removed — stop playback.
                    setQueueIndex(-1);
                    _setPlaying(false);
                    _setMedia(null);
                    setPos(0);
                } else {
                    // Play the item at the same index (which is now the next item).
                    setQueueIndex(Math.min(index, queue.length - 2));
                }
            } else if (index < queueIndex) {
                setQueueIndex(prev => prev - 1);
            }

            // Update shuffle order.
            if (shuffleOrderRef.current) {
                shuffleOrderRef.current = shuffleOrderRef.current
                    .filter(i => i !== index)
                    .map(i => i > index ? i - 1 : i);
            }
        }, [queue, queueIndex]);

        // Scan runner — one function that both startScan and addFolderFromPicker share
        const runScan = useCallback(async (targets: Folder[]) => {
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
                let totalFound = 0;
                const folderCounts: Record<string, number> = {};

                for (const folder of targets) {
                    if (cancelled) break;
                    const { itemsFound } = await librarymanager.scanFolder(folder, (p) => {
                        setScan(prev => prev ? {
                            ...prev,
                            itemsFound: p.itemsFound,
                            itemsExpected: p.itemsExpected,
                            currentFolder: p.currentFolder,
                        } : prev);
                    });
                    totalFound += itemsFound;
                    folderCounts[folder.id] = itemsFound;
                }

                setScan(null);

                if (Object.keys(folderCounts).length > 0) {
                    setFolders(prev => prev.map(f => {
                        const c = folderCounts[f.id];
                        return c !== undefined ? { ...f, itemCount: c } : f;
                    }));
                }

                setLibraryMeta({
                    folders: targets.length,
                    itemCount: totalFound,
                    lastScanAt: cancelled ? (libraryMeta.lastScanAt ?? Date.now()) : Date.now(),
                });

                if (!cancelled) {
                    toast(`Scanned ${targets.length} folder${targets.length === 1 ? '' : 's'} · ${totalFound.toLocaleString()} items`);
                } else {
                    toast('Scan cancelled — partial results kept');
                }
            } catch (err) {
                setScan(null);
                toast(`Scan failed: ${err instanceof Error ? err.message : String(err)}`, 'err');
            }
        }, [toast, libraryMeta.lastScanAt]);

        useEffect(() => {
            setLibraryMeta(prev => ({
                ...prev,
                folders: folders.length,
                itemCount: folders.reduce((n, f) => n + f.itemCount, 0),
            }));
        }, [folders]);

        // Public scan actions:
        // PS1
        const startScan = useCallback(async () => {
            if (scan?.inProgress) return;
            await runScan(folders);
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
            const folder: Folder = {
                id,
                label,
                path,
                itemCount: 0,
            };

            setFolders(prev => [...prev, folder]);

            await runScan([folder]);
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
                        p.id === rp.id || p.name === rp.name
                    );
                    out.push({
                        ...rp,
                        repositoryId: catalog.repository.id,
                        repositoryLabel: catalog.repository.label,
                        installed: !!installed,
                        installedVersion: installed?.version,
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
                name: entry.name,
                provider: entry.provider,
                version: entry.version,
                category: entry.category,
                description: entry.description,
                long: entry.longDescription,
                homepage: entry.homepage,
                on: false,   // newly-installed plugins start disabled — user enables
                status: 'ok',
                signed: entry.signed,
                apiVersion: entry.apiVersion,
                size: entry.size,
                installPath: `~/.openreel/plugins/${entry.id.replace(':', '-')}`,
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
            pendingSeekRef.current = null;
            pendingPlayRef.current = false;
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
                case 'video': setView('now'); setMedia(null); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'audio': setView('now'); setMedia(null); setPlaying(true); setPos(0.31); setQueueOpen(false); break;
                case 'tracks': setView('now'); setMedia(null); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'queue': setView('now'); setMedia(null); setPlaying(true); setPos(0.28); setQueueOpen(true); break;
                case 'library': setView('library'); setMedia(null); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'settings': setView('settings'); setMedia(null); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'plugins': setView('plugins'); setMedia(null); setQueueOpen(false); break;
                case 'install': setView('plugins'); setMedia(null); setModal('install'); setQueueOpen(false); break;
                case 'error': setView('now'); setMedia(null); setQueueOpen(false); break;
                case 'shortcuts': setView('shortcuts'); setMedia(null); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'about': setView('about'); setMedia(null); setPlaying(true); setPos(0.28); setQueueOpen(false); break;
                case 'loading': setView('now'); setMedia(null); setPlaying(true); setBuffering(true); setPos(0.28); setQueueOpen(false); break;
                case 'offline': setView('now'); setMedia(null); setPlaying(true); setOffline(true); setPos(0.28); setQueueOpen(false); break;
                // Error Cases
                case 'error-missing': setView('now'); setMedia(null); setQueueOpen(false); break;
                case 'error-permission': setView('now'); setMedia(null); setQueueOpen(false); break;
                case 'error-corrupt': setView('now'); setMedia(null); setQueueOpen(false); break;
                case 'error-no-audio': setView('now'); setMedia(null); setQueueOpen(false); break;
                case 'error-video-out': setView('now'); setMedia(null); setQueueOpen(false); break;
                case 'error-plugin': setView('now'); setMedia(null); setQueueOpen(false); break;
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
        const watchAvailable = useMemo(() => librarymanager.isWatchAvailable(), []);
        const mediaInfoCache = _mediaInfoCache.current
        // const  transcode = _transcode as TranscodeType
        /* --------------------------------------------------------
         *    Memoized context value
         *    -------------------------------------------------------- */
        const value = useMemo<PlayerState>(() => ({
            // theme
            theme, themePref, setThemePref,
            // routing
            view, setView,
            // media
            media, playMedia, playMediaInternal, setMedia, hasMedia,
            // transport
            playing, setPlaying, syncPlayingFromElement, pos, dur, setPos, vol, setVol, muted, setMuted,
            speed, setSpeed, subTrack, setSubTrack,
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
            mediaInfoOpen, setMediaInfoOpen, getMediaInfo, mediaInfoCache,
            // Scanning
            libraryMeta, scan, startScan, cancelScan, lastScanId, setLastScanId,
            // Pref
            prefs,
            // Plugin repository
            availableEntries, addRepository, removeRepository, refreshRepositories, installFromRepository,
            repositories, catalogs, repositoriesLoading, repositoryError,
            // Folder management
            addFolderFromPicker, removeFolder, removeLibrary, folders,
            registerVideoElement, updateMediaDuration, watchAvailable,
            // Crash
            exitSafeModeAndReload, enterSafeMode, safeMode, safeModeReason,
            consumePendingPlayback,
            //Lib
            libraryIndexReady, setLibraryIndexReady,
            // Recent
            recentIds, clearRecents,
            // File opening
            openFiles,
            // Queue ops
            repeat, setRepeat, shuffle, toggleShuffle, cycleRepeat, removeQueueItem,
            clearQueue, queueMoveNext, queueMoveToTop, openDroppedFiles,
            // MKV handling
            transcode, setTranscode, mediaRef,
            // Tracks man
            audioTracks, setAudioTracks, subtitleTracks, videoTracks, setSubtitleTracks,
            selectedAudio, selectedVideo, selectedSubtitle,
            switchAudioTrack, switchSubtitleTrack, switchVideoTrack,
            currentAspect, setCurrentAspect, abRepeat, cycleAbRepeat,
        }), [
            // ---- Must mirror the value object field-for-field ----
            theme, themePref, systemDark,
            view,
            media, hasMedia,
            playing, pos, dur, vol, muted, speed, subTrack,
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
            playMedia, playMediaInternal, playQueueItem, nextItem, prevItem,
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
            libraryMeta, scan, startScan, cancelScan, lastScanId, setLastScanId,
            // Plugin repository
            availableEntries, addRepository, removeRepository, refreshRepositories, installFromRepository,
            repositories, catalogs, repositoriesLoading, repositoryError,
            // Folder management
            addFolderFromPicker, removeFolder, removeLibrary, folders,
            registerVideoElement, updateMediaDuration, watchAvailable,
            // Crash
            exitSafeModeAndReload, enterSafeMode, safeMode, safeModeReason,
            consumePendingPlayback,
            //prefs
            prefs,
            //Lib
            libraryIndexReady, setLibraryIndexReady,
            mediaInfoCache,
            // Recent
            recentIds, clearRecents,
            // File opening
            openFiles,
            // QUEUE ops
            repeat, setRepeat, shuffle, toggleShuffle, cycleRepeat, removeQueueItem, clearQueue, queueMoveToTop, queueMoveNext, openDroppedFiles,
            // MKV handling
            transcode, setTranscode, mediaRef,
            // Tracks man
            audioTracks, setAudioTracks, videoTracks, subtitleTracks, setSubtitleTracks,
            selectedAudio, selectedVideo, selectedSubtitle,
            switchAudioTrack, switchSubtitleTrack, switchVideoTrack,
            currentAspect, setCurrentAspect, abRepeat, cycleAbRepeat,
        ]);

        return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
    }
}
