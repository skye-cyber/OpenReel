import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { isTauri } from '../lib/platform/system/shared';

interface DragDropPayload {
  paths: string[];
  position: { x: number; y: number };
}

export function useDragDrop(onDrop: (paths: string[]) => void) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isTauri) return;

    let cancelled = false;
    const unlisteners: Array<() => void> = [];

    void (async () => {
      const unenter = await listen<DragDropPayload>('tauri://drag-enter', () => {
        if (!cancelled) setDragging(true);
      });
      unlisteners.push(unenter);

      const unover = await listen<DragDropPayload>('tauri://drag-over', () => {
        // Keep dragging true during hover.
      });
      unlisteners.push(unover);

      const unleave = await listen<DragDropPayload>('tauri://drag-leave', () => {
        if (!cancelled) setDragging(false);
      });
      unlisteners.push(unleave);

      const undrop = await listen<DragDropPayload>('tauri://drag-drop', (event) => {
        if (cancelled) return;
        setDragging(false);
        const paths = event.payload?.paths ?? [];
        if (paths.length > 0) onDrop(paths);
      });
      unlisteners.push(undrop);
    })();

    return () => {
      cancelled = true;
      for (const u of unlisteners) u();
    };
  }, [onDrop]);

  return { dragging };
}
