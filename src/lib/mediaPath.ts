import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './platform/system/shared';

let streamPort: number | null = null;

async function getStreamPort(): Promise<number | null> {
    if (streamPort !== null) return streamPort;
    if (!isTauri) return null;
    try {
        streamPort = await invoke<number>('get_stream_port');
        console.info(`[mediaPath] stream server port: ${streamPort}`);
        return streamPort;
    } catch (err) {
        console.warn('[mediaPath] stream server not available', err);
        streamPort = null;
        return null;
    }
}

export const initStreamPort = async() => await getStreamPort();


export async function toMediaUrl(path: string | undefined | null): Promise<string> {
    if (!path) return '';

    if (
        path.startsWith('http://') || path.startsWith('https://') ||
        path.startsWith('blob:') || path.startsWith('asset://') ||
        path.startsWith('stream://') || path.startsWith('data:')
    ) {
        return path;
    }

    if (path.startsWith('/media/') && !isTauri) {
        return path;
    }

    if (isTauri) {
        const port = await getStreamPort();
        if (!port) return '';
        return `http://127.0.0.1:${port}/stream?path=${encodeURIComponent(path)}`;
    }

    return '';
}
