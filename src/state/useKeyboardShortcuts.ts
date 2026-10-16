import { useEffect } from 'react';
import { usePlayer } from './PlayerContext';

/**
 * Global keyboard shortcut handler for OpenReel.
 *
 * Mounted once inside <PlayerProvider>. Listens on `window` so shortcuts
 * work regardless of which view is active, and so we never end up with
 * duplicate handlers when two components are mounted simultaneously.
 *
 * Rules:
 *  - Single-key shortcuts are suppressed while a text field has focus.
 *  - Escape always works, even inside a text field (it blurs).
 *  - Space / arrows / `/` call preventDefault to stop page scrolling.
 */
export function useKeyboardShortcuts() {
    const p = usePlayer();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const inField =
                !!target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);

            // Escape always wins.
            if (e.key === 'Escape') {
                // 1. Blur text fields first — always allowed.
                if (inField && target) {
                    target.blur();
                    return;
                }
                // 2. Otherwise, let the top of the escape stack handle it.
                if (p.runTopEscape()) {
                    e.preventDefault();
                }
                return;
            }

            // Function keys are handled before the letter switch.
            if (e.key === 'F1') {
                e.preventDefault();
                p.setView('shortcuts');
                return;
            }
            if (e.key === 'F11') {
                e.preventDefault();
                p.toggleFullscreen();
                return;
            }

            // Anything else that types into a field is left alone.
            if (inField) return;

            const mod = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            if (mod && shift && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                p.setView('about');
                p.setAboutTab('diag');

                return;
            }

            /* ---------- View shortcuts ---------- */
            if (mod && !shift && !e.altKey) {
                switch (e.key) {
                    case '1': e.preventDefault(); p.setView('now'); return;
                    case '2': e.preventDefault(); p.setView('library'); return;
                    case '3': e.preventDefault(); p.setView('plugins'); return;
                    case '4': e.preventDefault(); p.setView('settings'); return;
                    case ',': e.preventDefault(); p.setView('settings'); return;
                    case 'o': e.preventDefault(); p.setView('open'); return;
                    case 'f':
                        e.preventDefault();
                        {
                            const el = document.querySelector<HTMLInputElement>('[data-search-field]');
                            el?.focus();
                            el?.select();
                        }
                        return;
                }
            }

            /* ---------- Transport ---------- */
            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (p.hasMedia) p.setPlayingAnnounced(!p.playing); // p.setPlaying(!p.playing);
                    return;

                case 'ArrowLeft':
                    e.preventDefault();
                    p.seekBy(shift ? -1 : -5);
                    return;

                case 'ArrowRight':
                    e.preventDefault();
                    p.seekBy(shift ? 1 : 5);
                    return;

                case 'ArrowUp':
                    e.preventDefault();
                    p.setVol(Math.min(p.vol + 0.05, 1));
                    p.setMutedAnnounced(false);
                    return;

                case 'ArrowDown':
                    e.preventDefault();
                    p.setVol(Math.max(p.vol - 0.05, 0));
                    return;

                case 'm': case 'M':
                    p.setMuted(!p.muted);
                    return;

                case 'f': case 'F':
                    p.toggleFullscreen();
                    return;

                case 'n': case 'N':
                    p.nextItem();
                    return;

                case 'p': case 'P':
                    p.prevItem();
                    return;

                case 'q': case 'Q':
                    p.setQueueOpen(!p.queueOpen);
                    return;

                case 'r': case 'R':
                    if (shift) p.toast('Shuffle: on — Undo');
                    else p.toast('Repeat: all — Undo');
                    return;

                case 'a': case 'A':
                    if (shift) p.toast('Audio track menu');
                    else {
                        const next = (p.audioTrack + 1) % 3;
                        // p.setAudioTrack(next);
                        p.setAudioTrackAnnounced(next)
                        p.toast('Audio track changed — Undo');
                    }
                    return;

                case 'v': case 'V':
                    if (shift) p.toast('Subtitle menu');
                    else {
                        const next = p.subTrack >= 2 ? -1 : p.subTrack + 1;
                        // p.setSubTrack(next);
                        p.setSubTrackAnnounced(next)
                        p.toast(next === -1 ? 'Subtitles: off' : 'Subtitles changed — Undo');
                    }
                    return;

                case '[':
                    p.setSpeedAnnounced(Math.max(p.speed / 2, 0.25));
                    p.toast(`Speed ${Math.max(p.speed / 2, 0.25)}× — Undo`);
                    return;

                case ']':
                    p.setSpeedAnnounced(Math.min(p.speed * 2, 4));
                    p.toast(`Speed ${Math.min(p.speed * 2, 4)}× — Undo`);
                    return;

                case 'Backspace':
                    p.setSpeedAnnounced(1);
                    p.toast('Speed reset to 1×');
                    return;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [p]);
}
