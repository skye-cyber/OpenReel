/**
 * Derive a display label from a folder path.
 */
export function labelForFolderPath(path: string): string {
    const trimmed = path.replace(/\/+$/, '');
    const parts = trimmed.split('/');
    const last = parts[parts.length - 1];
    if (!last || last === '~') return path;
    return last;
}

/**
 * Derive a stable id from a folder path. Two folders with the same path
 * should have the same id so re-adding is a no-op.
 */
export function idForFolderPath(path: string): string {
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = ((hash << 5) - hash + path.charCodeAt(i)) | 0;
    }
    return 'f' + Math.abs(hash).toString(36);
}
