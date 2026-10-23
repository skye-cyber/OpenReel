import type { HardwareProbe, LogTail, PlatformInfo, UpdateCheckResult } from '../../../types/platform';
import {
    type SessionState,
    type SafeModeReason,
    type BrowserSafeModeFlag
} from './shared';

const BROWSER_SESSION_KEY = 'openreel.session.v1';
const BROWSER_SAFE_MODE_KEY = 'openreel.safe-mode.v1';
const CRASH_WINDOW_MS = 60_000;
const MAX_CRASH_LOG = 5;

class BrowserImpl {
    browserGetSessionState(): SessionState {
        if (typeof window === 'undefined') return { cleanExit: true, recentCrashes: [] };
        try {
            const raw = window.localStorage.getItem(BROWSER_SESSION_KEY);
            if (!raw) return { cleanExit: true, recentCrashes: [] };
            const parsed = JSON.parse(raw) as Partial<SessionState>;
            return {
                cleanExit: typeof parsed.cleanExit === 'boolean' ? parsed.cleanExit : true,
                recentCrashes: Array.isArray(parsed.recentCrashes)
                    ? parsed.recentCrashes
                        .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
                        .slice(-MAX_CRASH_LOG)
                    : [],
            };
        } catch {
            return { cleanExit: true, recentCrashes: [] };
        }
    }
    browserMarkSessionStart(): SessionState {
        if (typeof window === 'undefined') return { cleanExit: true, recentCrashes: [] };
        const previous = this.browserGetSessionState();
        const now = Date.now();

        const nextCrashes = previous.cleanExit
            ? previous.recentCrashes.filter(t => now - t < CRASH_WINDOW_MS)
            : [...previous.recentCrashes, now]
                .filter(t => now - t < CRASH_WINDOW_MS)
                .slice(-MAX_CRASH_LOG);

        try {
            window.localStorage.setItem(
                BROWSER_SESSION_KEY,
                JSON.stringify({ cleanExit: false, recentCrashes: nextCrashes }),
            );
        } catch { /* storage unavailable */ }

        return { cleanExit: previous.cleanExit, recentCrashes: nextCrashes };
    }
    browserMarkCleanExit(): void {
        if (typeof window === 'undefined') return;
        try {
            const current = this.browserGetSessionState();
            window.localStorage.setItem(
                BROWSER_SESSION_KEY,
                JSON.stringify({ cleanExit: true, recentCrashes: current.recentCrashes }),
            );
        } catch { /* ignore */ }
    }
    browserIsSafeMode(): boolean {
        if (typeof window === 'undefined') return false;
        try {
            const raw = window.localStorage.getItem(BROWSER_SAFE_MODE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw) as Partial<BrowserSafeModeFlag>;
            return parsed.active === true;
        } catch { return false; }
    }
    browserGetSafeModeReason(): SafeModeReason | null {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(BROWSER_SAFE_MODE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as Partial<BrowserSafeModeFlag>;
            if (parsed.active !== true) return null;
            return parsed.reason === 'user' ? 'user' : 'crash';
        } catch { return null; }
    }
    browserEnterSafeMode(reason: SafeModeReason): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(
                BROWSER_SAFE_MODE_KEY,
                JSON.stringify({ active: true, reason, activatedAt: Date.now() }),
            );
            const current = this.browserGetSessionState();
            window.localStorage.setItem(
                BROWSER_SESSION_KEY,
                JSON.stringify({ cleanExit: true, recentCrashes: current.recentCrashes }),
            );
        } catch { /* ignore */ }
    }
    browserExitSafeMode(): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.removeItem(BROWSER_SAFE_MODE_KEY);
        } catch { /* ignore */ }
    }

    async browserProbeHardware(): Promise<HardwareProbe> {
        await new Promise(r => setTimeout(r, 800));
        return {
            available: true,
            backend: 'VA-API',
            device: 'Intel Iris Xe (Mesa)',
            codecs: ['h264', 'vp9'],
            unavailableCodecs: ['av1', 'hevc'],
        };
    }

    async browserPlatformInfo(): Promise<PlatformInfo> {
        if (typeof navigator === 'undefined') {
            return {
                os: 'Unknown', osVersion: '', session: 'unknown', desktop: '',
                gpu: '', audioBackend: '', displayScaling: 1,
            };
        }
        const ua = navigator.userAgent;
        const os =
            /Linux/.test(ua) ? 'Linux' :
                /Mac/.test(ua) ? 'macOS' :
                    /Windows/.test(ua) ? 'Windows' : 'Unknown';
        return {
            os,
            osVersion: 'BROWSER_APPROX',
            session: 'browser',
            desktop: '',
            gpu: 'Browser-managed',
            audioBackend: 'Browser-managed',
            displayScaling: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        };
    }

    async browserPickFolder(): Promise<string | null> {
        await new Promise(r => setTimeout(r, 400));
        if (Math.random() < 0.1) return null;
        return '~/Videos/New Folder';
    }

    async browserOpenExternal(url: string): Promise<void> {
        if (typeof window !== 'undefined') {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    async browserOpenPath(_path: string): Promise<void> {
        // No-op in browser.
    }

    async browserCheckForUpdates(): Promise<UpdateCheckResult> {
        return { available: false };
    }
    async browserLogTail(): Promise<LogTail> {
        return {
            lines: [
                {
                    timestamp: new Date().toISOString(),
                    level: 'INFO',
                    message: 'Log file is not available in the browser build.',
                },
            ],
            path: '(browser)',
            error: null,
        };
    }
}

export const BrowserSession = new BrowserImpl();
