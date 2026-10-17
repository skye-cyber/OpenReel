import type { Media } from "../types";

export const SUPPORTED_SCHEMES = ['http:', 'https:', 'rtsp:', 'rtmp:', 'srt:', 'file:'];
export const SCHEME_LABELS = ['http', 'https', 'rtsp', 'rtmp', 'srt', 'file'];

export const SCHEME_HINTS: Record<string, string> = {
    http: 'Regular HTTP streams and progressive downloads.',
    https: 'Encrypted HTTP streams.',
    rtsp: 'Real Time Streaming Protocol — used by many IP cameras and media servers.',
    rtmp: 'Real Time Messaging Protocol — used by some streaming services.',
    srt: 'Secure Reliable Transport — low-latency contribution streams.',
    file: 'A local path. Equivalent to opening a file directly.',
};

export interface ParsedUrl {
    ok: true;
    media: Media;
}

export interface ParseError {
    ok: false;
    message: string;
}

export interface UrlDialogProps {
    onClose: () => void;
}
