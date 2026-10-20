import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from './platform/system/shared';
import { usePlayer } from '../hooks/player';

export function StartupFilesHandler() {
    const { openDroppedFiles } = usePlayer();
    const openRef = useRef(openDroppedFiles);
    openRef.current = openDroppedFiles;

    useEffect(() => {
        if (!isTauri) return;

        let cancelled = false;

        // Cold start: read paths stored before the webview mounted.
        void (async () => {
            try {
                const paths = await invoke<string[]>('get_startup_files');
                if (cancelled || paths.length === 0) return;
                await openRef.current(paths);
            } catch {
                // No startup files.
            }
        })();

        // Warm start: second instance forwarded paths.
        const unlisten = listen<string[]>('single-instance-files', async (event) => {
            if (cancelled) return;
            const paths = event.payload ?? [];
            if (paths.length === 0) return;
            await openRef.current(paths);
        });

        return () => {
            cancelled = true;
            void unlisten.then(fn => fn());
        };
    }, []);

    return null;
}
