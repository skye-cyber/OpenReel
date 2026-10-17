/**
 * Position resume storage.
 *
 * TODO(tauri): shall be backed this with a real persistent store once Tauri is
 * integrated. The store should be keyed by a stable media identifier
 * (currently `Media.title`, later a content hash or file path), and
 * should be pruned when the underlying file disappears.
 *
 * The current implementation is in-memory only. Positions survive
 * within a session but not across reloads.
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
