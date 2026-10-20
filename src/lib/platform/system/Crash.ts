import { invoke } from '@tauri-apps/api/core';
import { BrowserSession as BS } from './browser';
import {
    isTauri, type SessionState,
    type SafeModeReason
} from './shared';
/**
 * Platform boundary — session state, safe mode, and native probes.
 *
 * Two class singletons:
 *   - SessionCrashHandler: crash detection and safe-mode flag
 *   - PlatformTools: hardware probes, folder picking, shell operations
 *
 * In Tauri, methods invoke Rust commands. In the browser, they fall
 * back to localStorage and simulations so `npm run dev` works.
 */

/* ============================================================
 S essionCrashHandler                                           *
 ============================================================ */

class CrashHandlerImpl {
    async getSessionState(): Promise<SessionState> {
        if (isTauri) return invoke<SessionState>('get_session_state');
        return BS.browserGetSessionState();
    }

    async markSessionStart(): Promise<SessionState> {
        if (isTauri) return invoke<SessionState>('mark_session_start');
        return BS.browserMarkSessionStart();
    }

    async markCleanExit(): Promise<void> {
        if (isTauri) return invoke('mark_clean_exit');
        BS.browserMarkCleanExit();
    }

    async isSafeMode(): Promise<boolean> {
        if (isTauri) return invoke<boolean>('is_safe_mode');
        return BS.browserIsSafeMode();
    }

    async getSafeModeReason(): Promise<SafeModeReason | null> {
        if (isTauri) return invoke<SafeModeReason | null>('get_safe_mode_reason');
        return BS.browserGetSafeModeReason();
    }

    async enterSafeMode(reason: SafeModeReason = 'user'): Promise<void> {
        if (isTauri) return invoke('enter_safe_mode', { reason });
        BS.browserEnterSafeMode(reason);
    }

    async exitSafeMode(): Promise<void> {
        if (isTauri) return invoke('exit_safe_mode');
        BS.browserExitSafeMode();
    }

    /** Pure computation — no invoke. */
    detectCrashLoop(previous: SessionState): boolean {
        if (previous.cleanExit) return false;
        return previous.recentCrashes.length >= 2;
    }
}


export const CrashHandler = new CrashHandlerImpl();
