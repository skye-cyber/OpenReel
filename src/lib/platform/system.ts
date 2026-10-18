import type { HardwareProbe, PlatformInfo } from "../../types/platform";

/**
 * Session state and safe mode — platform boundary.
 *
 * TODO(tauri): replace localStorage with filesystem writes against
 * ~/.local/share/openreel/session.json and ~/.local/share/openreel/safe-mode.flag.
 * The public API stays the same; only the storage changes.
 */

export interface SessionState {
    /** True if the previous session exited via beforeunload. */
    cleanExit: boolean;
    /** Timestamps (ms) of recent unclean exits, most recent last. */
    recentCrashes: number[];
}

export type SafeModeReason = 'user' | 'crash';

interface SafeModeFlag {
    active: boolean;
    reason: SafeModeReason;
    activatedAt: number;
}

class SessionManager {
    private readonly SESSION_KEY = 'openreel.session.v1';
    private readonly SAFE_MODE_KEY = 'openreel.safe-mode.v1';
    private readonly CRASH_WINDOW_MS = 60_000;
    private readonly MAX_CRASH_LOG = 5;

    /* ---------- Session state ---------- */
    getSessionState(): SessionState {
        if (typeof window === 'undefined') {
            return { cleanExit: true, recentCrashes: [] };
        }
        try {
            const raw = window.localStorage.getItem(this.SESSION_KEY);
            if (!raw) return { cleanExit: true, recentCrashes: [] };
            const parsed = JSON.parse(raw) as Partial<SessionState>;
            return {
                cleanExit: typeof parsed.cleanExit === 'boolean' ? parsed.cleanExit : true,
                recentCrashes: Array.isArray(parsed.recentCrashes)
                    ? parsed.recentCrashes
                        .filter((x): x is number => typeof x === 'number' && Number.isFinite(x))
                        .slice(-this.MAX_CRASH_LOG)
                    : [],
            };
        } catch {
            return { cleanExit: true, recentCrashes: [] };
        }
    }

    /**
     * Called at app startup, before React mounts. Reads the previous
     * session's exit state, records a crash if applicable, and starts
     * a new session marked "not clean" until beforeunload fires.
     */
    markSessionStart(): SessionState {
        if (typeof window === 'undefined') {
            return { cleanExit: true, recentCrashes: [] };
        }
        const previous = this.getSessionState();
        const now = Date.now();

        const nextCrashes = previous.cleanExit
            ? previous.recentCrashes.filter(t => now - t < this.CRASH_WINDOW_MS)
            : [...previous.recentCrashes, now]
                .filter(t => now - t < this.CRASH_WINDOW_MS)
                .slice(-this.MAX_CRASH_LOG);

        try {
            window.localStorage.setItem(
                this.SESSION_KEY,
                JSON.stringify({ cleanExit: false, recentCrashes: nextCrashes }),
            );
        } catch {
            // Storage unavailable — safe mode won't work, but the app runs.
        }

        return { cleanExit: previous.cleanExit, recentCrashes: nextCrashes };
    }

    markCleanExit(): void {
        if (typeof window === 'undefined') return;
        try {
            const current = this.getSessionState();
            window.localStorage.setItem(
                this.SESSION_KEY,
                JSON.stringify({ cleanExit: true, recentCrashes: current.recentCrashes }),
            );
        } catch {
            // Ignore.
        }
    }

    /* ---------- Safe mode ---------- */
    isSafeMode(): boolean {
        if (typeof window === 'undefined') return false;
        try {
            const raw = window.localStorage.getItem(this.SAFE_MODE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw) as Partial<SafeModeFlag>;
            return parsed.active === true;
        } catch {
            return false;
        }
    }

    getSafeModeReason(): SafeModeReason | null {
        if (typeof window === 'undefined') return null;
        try {
            const raw = window.localStorage.getItem(this.SAFE_MODE_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as Partial<SafeModeFlag>;
            if (parsed.active !== true) return null;
            return parsed.reason === 'user' ? 'user' : 'crash';
        } catch {
            return null;
        }
    }

    enterSafeMode(reason: SafeModeReason = 'user'): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(
                this.SAFE_MODE_KEY,
                JSON.stringify({ active: true, reason, activatedAt: Date.now() }),
            );
            // Clear the crash log so the next normal start doesn't re-trigger.
            const current = this.getSessionState();
            window.localStorage.setItem(
                this.SESSION_KEY,
                JSON.stringify({ cleanExit: true, recentCrashes: current.recentCrashes }),
            );
        } catch {
            // Ignore.
        }
    }

    exitSafeMode(): void {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.removeItem(this.SAFE_MODE_KEY);
        } catch {
            // Ignore.
        }
    }

    /* ---------- Crash-loop detection ---------- */
    detectCrashLoop(previous: SessionState): boolean {
        if (previous.cleanExit) return false;
        return previous.recentCrashes.length >= 2;
    }
}


class PlatformTools {
    /**
     * Probe the device for hardware video decoding support.
     *
     * TODO(tauri): invoke('probe_hardware_decoding') — a Rust command
     * that checks VA-API (Linux), VideoToolbox (macOS), or D3D11VA
     * (Windows) and returns the detected backend. Should also report
     * whether the current build actually has the hardware codec
     * compiled in.
     */
    async probeHardwareDecoding(): Promise<HardwareProbe> {
        // Simulate a short delay so the UI has something to show.
        await new Promise(r => setTimeout(r, 800));

        // TODO(tauri): real detection. For now, assume the common Linux
        // case where VA-API is present but the specific codec may not be.
        return {
            available: true,
            backend: 'VA-API',
            device: 'Intel Iris Xe (Mesa)',
            codecs: ['h264', 'vp9'],
            unavailableCodecs: ['av1', 'hevc'],
        };
    }

    /**
     * Read static platform information for diagnostics.
     *
     * TODO(tauri): invoke('get_platform_info') — a Rust command that
     * reports OS version, session type (Wayland/X11), desktop
     * environment, GPU, and audio backend. All of these require OS APIs
     * the browser can't reach; the web build returns placeholders.
     */
    async getPlatformInfo(): Promise<PlatformInfo> {
        if (typeof navigator === 'undefined') {
            return {
                os: 'Unknown',
                osVersion: '',
                session: 'unknown',
                desktop: '',
                gpu: '',
                audioBackend: '',
                displayScaling: 1,
            };
        }
        // Best-effort detection from navigator.userAgent. This is what
        // the browser actually knows — not what the OS reports. Marked
        // as approximate in the type.
        const ua = navigator.userAgent;
        const os = /Linux/.test(ua) ? 'Linux'
            : /Mac/.test(ua) ? 'macOS'
                : /Windows/.test(ua) ? 'Windows'
                    : 'Unknown';

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
}
export const platformtools = new PlatformTools();
export const Session = new SessionManager();
export const SessionCrashManager = Session;
