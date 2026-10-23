/**
 * Position resume storage — in-memory.
 *
 * TODO(tauri): add a persistent backing store. The in-memory `Session`
 * stays — it's the fast path during a session. A separate async layer
 * (SessionStore) seeds it on startup and persists debounced writes.
 * PlayerContext uses the in-memory `Session` synchronously, and calls
 * SessionStore.save() on a debounce. Only SessionStore changes when
 * Tauri lands.
 */

const positions = new Map<string, number>();

export const Session = {
    get(key: string): number | undefined {
        return positions.get(key);
    },

    set(key: string, seconds: number): void {
        positions.set(key, seconds);
    },

    delete(key: string): void {
        positions.delete(key);
    },

    clear(): void {
        positions.clear();
    },
};
