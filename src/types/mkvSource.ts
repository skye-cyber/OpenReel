export interface AudioTrackInfo {
    /** Stream index in the source container (used for setAudioStreamIndex). */
    streamIndex: number;
    language: string | null;
    title: string | null;
}

export interface SubtitleCue {
    start: number;   // seconds
    end: number;     // seconds
    text: string;
}

export interface SubtitleTrackInfo {
    streamIndex: number;
    language: string | null;
    title: string | null;
    format: string[];
    cues: SubtitleCue[];
}

export interface MkvSourceResult {
    url: string | null;
    audioTracks: AudioTrackInfo[] | null;
    subtitleTracks: SubtitleTrackInfo[] | null;
    preparing: boolean;
    error: string | null;
    /** Change the active audio stream. No-op when not an MKV. */
    setAudioStream: (streamIndex: number) => Promise<void>;
}


export interface MkvRemuxer {
    worker: Worker;
    init: () => Promise<{
        data: ArrayBuffer;
        attachments: Array<{ filename: string; mimetype: string; data: ArrayBuffer }>;
        subtitles: Array<
            | { type: 'header'; streamIndex: number; content: string; format: string[]; language: string; title: string }
            | { type: 'dialogue'; streamIndex: number; start: number; end: number; dialogueIndex: number; layer: number; content: string; fields: Record<string, string> }
        >;
        audioStreams: Array<{ streamIndex: number; language: string; title: string }>;
        info: {
            input: { audioMimeType: string; duration: number; formatName: string; mimeType: string; videoMimeType: string };
            output: { audioMimeType: string; duration: number; formatName: string; mimeType: string; videoMimeType: string };
        };
        chapters: Array<{ index: number; start: number; end: number; title: string }>;
        indexes: Array<{ index: number; timestamp: number; pos: number }>;
        videoExtradata: ArrayBuffer;
    }>;
    read: () => Promise<{ data: ArrayBuffer; pts: number; duration: number; offset: number; finished: boolean }>;
    seek: (time: number) => Promise<{ data: ArrayBuffer; pts: number; duration: number; offset: number }>;
    setAudioStreamIndex: (index: number) => Promise<void>;
    destroy: () => Promise<void>;
}

