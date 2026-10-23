import { useEffect, useRef, useState } from 'react';
import { makeRemuxer } from 'libav-wasm';
import type {
    MkvSourceResult, AudioTrackInfo,
    MkvRemuxer
} from '../types/mkvSource';
import appendBuffer from './mkvsource/buffer';
import assembleSubtitleTracks from './mkvsource/assembler';


function isMkv(url: string | null): boolean {
    return !!url && /\.mkv(\?|$)/i.test(url);
}


export function useMkvSource(sourceUrl: string | null): MkvSourceResult {
    const [result, setResult] = useState<MkvSourceResult>({
        url: null,
        audioTracks: null,
        subtitleTracks: null,
        preparing: false,
        error: null,
        setAudioStream: async () => { },
    });

    const remuxerRef = useRef<MkvRemuxer | null>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const objectUrlRef = useRef<string | null>(null);
    const feedLoopActiveRef = useRef(false);
    const generationRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        const myGeneration = ++generationRef.current;

        const cleanup = () => {
            cancelled = true;
            feedLoopActiveRef.current = false;

            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }

            if (remuxerRef.current) {
                void remuxerRef.current.destroy();
                remuxerRef.current = null;
            }

            mediaSourceRef.current = null;
            sourceBufferRef.current = null;
        };

        if (!sourceUrl || !isMkv(sourceUrl)) {
            setResult({
                url: null,
                audioTracks: null,
                subtitleTracks: null,
                preparing: false,
                error: null,
                setAudioStream: async () => { },
            });
            return cleanup;
        }

        setResult({
            url: null,
            audioTracks: null,
            subtitleTracks: null,
            preparing: true,
            error: null,
            setAudioStream: async () => { },
        });

        void (async () => {
            let remuxer: MkvRemuxer | null = null;
            let objectUrl: string | null = null;

            try {
                const head = await fetch(sourceUrl, { method: "HEAD" });
                if (!head.ok) {
                    throw new Error(`Could not read file headers: ${head.status}`);
                }

                const contentLength = Number(head.headers.get("content-length"));
                if (!Number.isFinite(contentLength) || contentLength <= 0) {
                    throw new Error("Could not determine file size");
                }

                remuxer = (await makeRemuxer({
                    publicPath: "/libav-wasm/",
                    workerUrl: "/libav-wasm/worker.js",
                    workerOptions: { type: "module" },
                    length: contentLength,
                    read: async (offset: number, size: number) => {
                        const end = Math.min(offset + size - 1, contentLength - 1);
                        const response = await fetch(sourceUrl, {
                            headers: { Range: `bytes=${offset}-${end}` },
                        });

                        if (!response.ok) {
                            throw new Error(`Range read failed: ${response.status}`);
                        }

                        return response.arrayBuffer();
                    },
                })) as unknown as MkvRemuxer;

                if (cancelled) {
                    await remuxer.destroy();
                    return;
                }

                remuxerRef.current = remuxer;

                const initResult = await remuxer.init();

                if (cancelled) return;

                const videoMime = initResult.info.output.videoMimeType;
                const audioMime = initResult.info.output.audioMimeType;
                const codecs = [videoMime, audioMime].filter(Boolean).join(",");
                const mime = `video/mp4; codecs="${codecs}"`;

                if (!MediaSource.isTypeSupported(mime)) {
                    throw new Error(
                        `This file uses ${videoMime || "unknown"} video, which this browser cannot decode.`,
                    );
                }

                const audioTracks: AudioTrackInfo[] = initResult.audioStreams.map((audio) => ({
                    streamIndex: audio.streamIndex,
                    language: audio.language || null,
                    title: audio.title || null,
                }));

                const subtitleTracks = assembleSubtitleTracks(initResult.subtitles);

                const mediaSource = new MediaSource();
                mediaSourceRef.current = mediaSource;

                objectUrl = URL.createObjectURL(mediaSource);
                objectUrlRef.current = objectUrl;

                // Publish the object URL immediately, still preparing.
                if (generationRef.current === myGeneration) {
                    setResult(prev => ({
                        ...prev,
                        url: objectUrl,
                        preparing: true,
                    }));
                }

                await new Promise<void>((resolve, reject) => {
                    if (mediaSource.readyState === 'open') { resolve(); return; }
                    const onOpen = () => { /* cleanup */ resolve(); };
                    const onError = () => { /* cleanup */ reject(new Error('Could not open MediaSource')); };
                    mediaSource.addEventListener('sourceopen', onOpen, { once: true });
                    mediaSource.addEventListener('error', onError, { once: true });
                });

                if (cancelled) return;

                const sourceBuffer = mediaSource.addSourceBuffer(mime);
                sourceBufferRef.current = sourceBuffer;

                await appendBuffer(sourceBuffer, initResult.data);

                if (generationRef.current === myGeneration) {
                    setResult(prev => ({
                        ...prev,
                        url: objectUrl,
                        audioTracks,
                        subtitleTracks,
                        preparing: false,
                        error: null,
                        setAudioStream,
                    }));
                }

                if (cancelled) return;

                const setAudioStream = async (streamIndex: number) => {
                    try {
                        await remuxer?.setAudioStreamIndex(streamIndex);
                    } catch {
                        // Handle or report the stream-switching error as needed.
                    }
                };

                setResult({
                    url: objectUrl,
                    audioTracks,
                    subtitleTracks,
                    preparing: false,
                    error: null,
                    setAudioStream,
                });

                feedLoopActiveRef.current = true;

                const feed = async () => {
                    const MAX_BUFFER_AHEAD_SECONDS = 30;  // stop fetching when 30s ahead

                    while (!cancelled && feedLoopActiveRef.current) {
                        const v = document.querySelector('video');
                        if (!v) break;

                        // Check how much is buffered ahead of the playhead.
                        const buffered = sourceBuffer.buffered;
                        let bufferedAhead = 0;
                        for (let i = 0; i < buffered.length; i++) {
                            if (buffered.start(i) <= v.currentTime && buffered.end(i) >= v.currentTime) {
                                bufferedAhead = buffered.end(i) - v.currentTime;
                                break;
                            }
                        }

                        // If we're far enough ahead, wait a bit before reading more.
                        if (bufferedAhead > MAX_BUFFER_AHEAD_SECONDS) {
                            await new Promise(r => setTimeout(r, 500));
                            continue;
                        }

                        try {
                            const chunk = await remuxer!.read();
                            if (cancelled || !feedLoopActiveRef.current) break;
                            if (chunk.finished) break;
                            if (chunk.data && chunk.data.byteLength > 0) {
                                await appendBuffer(sourceBuffer, chunk.data);
                            }
                        } catch (err) {
                            // If QuotaExceededError slipped through, wait and retry.
                            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
                                await new Promise(r => setTimeout(r, 1000));
                                continue;
                            }
                            break;
                        }
                    }
                    if (mediaSource.readyState === 'open' && !cancelled && feedLoopActiveRef.current) {
                        try { mediaSource.endOfStream(); } catch { /* already ended */ }
                    }
                };
                void feed();
            } catch (error) {
                if (cancelled) return;
                console.error("MKV preparation failed:", error);

                setResult({
                    url: null,
                    audioTracks: null,
                    subtitleTracks: null,
                    preparing: false,
                    error: error instanceof Error ? error.message : String(error),
                    setAudioStream: async () => { },
                });
            }
        })();

        return cleanup;
    }, [sourceUrl]);
    return result;
}
