import {
    createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
    type ReactNode,
} from 'react';
import type {
    Media, ModalId, Theme, ThemePref, ViewId, Toast, ToastKind, QueueItem,
    PluginActivity,
    Plugin
} from '../types';
import { AUDIO, ERROR_MEDIA, VIDEO, QUEUE as QUEUE_SEED, PLUGINS } from '../data/mock';
import { fmt } from '../lib/format';
import { loadPrefs, savePrefs } from './persist';

interface PlayerState {
    theme: Theme;
    themePref: ThemePref;
    setThemePref: (t: ThemePref) => void;

    view: ViewId;
    setView: (v: ViewId) => void;

    media: Media | null;
    playMedia: (m: Media) => void;
    setMedia: (m: Media | null) => void;
    hasMedia: boolean;

    playing: boolean;
    setPlaying: (p: boolean) => void;

    pos: number;
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

    aspect: 'fit' | 'fill' | 'stretch';
    setAspect: (a: 'fit' | 'fill' | 'stretch') => void;
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
    reducedMotionPref: 'system' | 'on' | 'off';
    setReducedMotionPref: (v: 'system' | 'on' | 'off') => void;

    density: 'comfortable' | 'compact';
    setDensity: (d: 'comfortable' | 'compact') => void;

    aboutTab: 'about' | 'diag' | 'feed';
    setAboutTab: (a: 'about' | 'diag' | 'feed') => void;

    buffered: number;
    seekTo: (n: number) => void;

    // Anouncements
    setPlayingAnnounced: (p: boolean) => void;
    setMutedAnnounced: (m: boolean) => void;
    setSpeedAnnounced: (s: number) => void;
    setAudioTrackAnnounced: (n: number) => void;
    setSubTrackAnnounced: (n: number) => void;
    liveMessage: string;
    setLiveMessage: (ms: string) => void;
}

const PlayerCtx = createContext<PlayerState | null>(null);

function prependActivity(p: Plugin, level: PluginActivity['level'], msg: string): PluginActivity[] {
    const now = new Date();
    const at = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    return [{ at, level, msg }, ...(p.activity ?? [])].slice(0, 8);
}

export function PlayerProvider({ children }: { children: ReactNode }) {
    const [view, setView] = useState<ViewId>('now');
    const [media, setMedia] = useState<Media | null>(null);
    const [playing, setPlaying] = useState(false);
    const [pos, setPos] = useState(0);
    const [audioTrack, setAudioTrack] = useState(0);
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
    const [aspect, setAspect] = useState<'fit' | 'fill' | 'stretch'>('fit');
    const [fullscreen, setFullscreen] = useState(false);
    const escapeStackRef = useRef<Array<{ id: string; handler: () => void }>>([]);

    const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
    const [confirmUninstallId, setConfirmUninstallId] = useState<string | null>(null);
    const [prefs] = useState(loadPrefs);  // loads once, never updated
    /*
 * The .map() filter is necessary. If a plugin was uninstalled in a previous session, its key is still in the persisted map. The map from PLUGINS (which is the source of installed plugins) skips unknown ids.
 */
    const [plugins, setPlugins] = useState<Plugin[]>(() => {
        const persisted = prefs.plugins ?? {};
        const uninstalled = new Set(prefs.uninstalled ?? []);
        return PLUGINS
            .filter(p => !uninstalled.has(p.id))
            .map(p => (p.id in persisted ? { ...p, on: persisted[p.id]! } : p));
    });
    //     const [plugins, setPlugins] = useState<Plugin[]>(() => {
    //         const persisted = prefs.plugins;
    //         if (!persisted || Object.keys(persisted).length === 0) return PLUGINS;
    //         return PLUGINS.map(p =>
    //             p.id in persisted ? { ...p, on: persisted[p.id]! } : p
    //         );
    //     });
    const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
    const [aboutTab, setAboutTab] = useState<'about' | 'diag' | 'feed'>('about');
    const [themePref, setThemePref] = useState<ThemePref>(prefs.themePref);
    const [vol, setVol] = useState(prefs.vol || 0.72);
    const [muted, setMuted] = useState(prefs.muted || false);
    const [speed, setSpeed] = useState(prefs.speed || 1);
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
    const [reducedMotionPref, setReducedMotionPref] = useState<'system' | 'on' | 'off'>('system');
    const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    const reducedMotion =
        reducedMotionPref === 'system' ? systemReducedMotion
            : reducedMotionPref === 'on';

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

    useEffect(() => {
        const t = setTimeout(() => {
            const pluginState: Record<string, boolean> = {};
            for (const p of plugins) pluginState[p.id] = p.on;
            savePrefs({ v: 1, themePref, vol, muted, speed, plugins: pluginState });
        }, 300);
        return () => clearTimeout(t);
    }, [themePref, vol, muted, speed, plugins]);

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
        setSelectedPluginId(id);
        if (id === null) {
            // When leaving the detail, clear any uninstall confirmation.
            setConfirmUninstallId(null);
        }
    }, []);

    const setPluginEnabled = useCallback((id: string, on: boolean) => {
        setPlugins(prev => prev.map(p => {
            if (p.id !== id) return p;
            if (p.st === 'incompat') return p;
            return { ...p, on };
        }));
    }, []);

    const uninstallPlugin = useCallback((id: string) => {
        setPlugins(prev => prev.filter(p => p.id !== id));
        setSelectedPluginId(cur => (cur === id ? null : cur));
        setConfirmUninstallId(null);
    }, []);

    const resolveConflict = useCallback((winnerId: string, loserId: string) => {
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

    // Playback tick: advances pos and buffered together.
    useEffect(() => {
        if (!playing || !hasMedia || buffering || offline) return;
        const t = setInterval(() => {
            setPos(p => {
                const next = p >= 0.999 ? 0 : p + 0.0018;
                if (next < p) {
                    // Wrapped to the start.
                    setBuffered(0);
                }
                return next;
            });
        }, 60);
        return () => clearInterval(t);
    }, [playing, hasMedia, buffering, offline]);

    // Keep buffered at least pos + LOOKAHEAD, capped at 1.
    // Runs on every pos change, which is fine — it's a cheap Math.max.
    useEffect(() => {
        setBuffered(b => Math.max(b, Math.min(pos + LOOKAHEAD, 1)));
    }, [pos]);

    const seekTo = useCallback((n: number) => {
        const clamped = Math.min(Math.max(n, 0), 1);
        setPos(clamped);
        setBuffered(clamped);
    }, []);

    /* --------------------------------------------------------
     *    Media loading
     *    -------------------------------------------------------- */
    const playMedia = useCallback((m: Media) => {
        setMedia(m);
        setPlaying(true);
        seekTo(0);
        setView('now');
        setScene(m.kind === 'audio' ? 'audio' : 'video');
    }, [setMedia, setView, seekTo]);

    const takeSnapshot = useCallback(() => {
        if (!hasMedia) return;
        const t = fmt(pos * dur);
        toast(`Snapshot saved at ${t} — JPEG 1920×1080`);
    }, [hasMedia, pos, dur, toast]);


    /* --------------------------------------------------------
     *    Queue navigation
     *    -------------------------------------------------------- */
    const playQueueItem = useCallback((i: number) => {
        const item = queue[i];
        if (!item || item.bad) {
            if (item?.bad) toast(`Skipped “${item.n}” — unplayable`, 'err');
            return;
        }
        setQueueIndex(i);
        // Reuse the queue's shape to synthesize a Media object.
        const next: Media = item.d === '12:48'
            ? { ...AUDIO, title: item.n }
            : { ...VIDEO, title: item.n, dur: parseDur(item.d) };
        playMedia(next);
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
        // Restart current item if we're more than 3 seconds in.
        if (pos > 3 / Math.max(dur, 1)) {
            seekTo(0);
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
    }, [queue, queueIndex, playQueueItem, pos, dur, toast]);

    /* --------------------------------------------------------
     *    Seeking
     *    -------------------------------------------------------- */
    const seekBy = useCallback((deltaSeconds: number) => {
        if (!hasMedia || dur === 0) return;
        setPos(p => {
            const next = p + deltaSeconds / dur;
            setBuffered(next);
            return Math.min(Math.max(next, 0), 1);
        });
    }, [hasMedia, dur]);

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

    /* --------------------------------------------------------
     *    Memoized context value
     *    -------------------------------------------------------- */
    const value = useMemo<PlayerState>(() => ({
        // Density
        density, setDensity,
        // theme
        theme, themePref, setThemePref,
        // routing
        view, setView,
        // media
        media, playMedia, setMedia, hasMedia,
        // transport
        playing, setPlaying, pos, setPos, vol, setVol, muted, setMuted,
        speed, setSpeed, audioTrack, setAudioTrack, subTrack, setSubTrack,
        // queue
        queue, queueIndex, playQueueItem, nextItem, prevItem,
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
        confirmUninstallId, setConfirmUninstallId, aspect, setAspect, takeSnapshot,
        // Reduced motion
        reducedMotionPref, setReducedMotionPref, reducedMotion,
        //About
        aboutTab, setAboutTab,
        //
        seekTo, buffered, setBuffered,
        // Anouncements
        setPlayingAnnounced, setMutedAnnounced, setSpeedAnnounced,
        setAudioTrackAnnounced, setSubTrackAnnounced,
        liveMessage, setLiveMessage, announce
    }), [
        // ---- Must mirror the value object field-for-field ----
        theme, themePref, systemDark,
        view,
        media, hasMedia,
        playing, pos, vol, muted, speed, audioTrack, subTrack,
        queue, queueIndex,
        queueOpen, advanced,
        buffering, offline,
        modal,
        toasts,
        scene,
        fullscreen,
        plugins, selectedPluginId, confirmUninstallId, aboutTab,
        // ---- Callbacks ----
        playMedia, playQueueItem, nextItem, prevItem,
        applyScene, toast, dismissToast, seekBy,
        toggleFullscreen, setFullscreen,
        pushEscapeHandler, popEscapeHandler, runTopEscape,
        setPluginEnabled, uninstallPlugin, resolveConflict, selectPlugin, setThemePref,
        buffered, setBuffered,
        // Anouncements
        setPlayingAnnounced, setMutedAnnounced, setSpeedAnnounced, setAudioTrackAnnounced,
        setSubTrackAnnounced, liveMessage, setLiveMessage, announce
    ]);

    return <PlayerCtx.Provider value={value}>{children}</PlayerCtx.Provider>;
}

/* ============================================================
 *  Hook
 *  ============================================================ */
export function usePlayer(): PlayerState {
    const ctx = useContext(PlayerCtx);
    if (!ctx) throw new Error('usePlayer must be used inside <PlayerProvider>');
    return ctx;
}

/* ============================================================
 *  Helpers
 *  ============================================================ */
function parseDur(s: string): number {
    // "48:31" → 2911; "1:42:08" → 6128; "—" → 0
    if (!s || s === '—') return 0;
    const parts = s.split(':').map(Number);
    if (parts.some(Number.isNaN)) return 0;
    if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
    if (parts.length === 2) return parts[0]! * 60 + parts[1]!;
    return 0;
}
