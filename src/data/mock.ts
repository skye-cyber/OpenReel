import type {
    AudioMedia, ErrorMedia, LibraryRow, OpenFileRow, Plugin,
    QueueItem, RecentItem, Scene, VideoMedia, PluginPermissionId,
    PluginPermission
} from '../types';

export const VIDEO: VideoMedia = {
    kind: 'video',
    title: 'lecture-04.mkv',
    sub: 'Chapter 3 · Encoding',
    dur: 2911,
    codec: 'MKV · H.264 · AC-3 5.1 · 1080p',
};

export const AUDIO: AudioMedia = {
    kind: 'audio',
    title: 'Field Recording No. 7',
    artist: 'Anna Selv',
    album: 'Coastal Studies',
    year: 2019,
    dur: 768,
    meta: 'FLAC · 24-bit/96 kHz · 2 ch · 2314 kbps',
};

export const ERROR_MEDIA: ErrorMedia = {
    kind: 'error',
    title: 'archive-old.mkv',
    dur: 0,
    codec: 'Container MKV · Video VC-1 · Audio AC-3 · 1.2 GB',
};

export const RECENTS: RecentItem[] = [
    { n: 'lecture-04.mkv', p: '~/Videos/Course', d: '48:31', k: 'video' },
    { n: 'field-recording-07.flac', p: '~/Music/Coastal Studies', d: '12:48', k: 'audio' },
    { n: 'seminar-02.mkv', p: '~/Videos/Course', d: '31:07', k: 'video' },
    { n: 'interview-draft.mp4', p: '~/Desktop', d: '22:15', k: 'video' },
];

export const OPEN_FILES: OpenFileRow[] = [
    { n: 'lecture-04.mkv', p: 'Course / Week 3', t: 'Matroska', s: '1.24 GB', m: '2 Sep 2026', d: '48:31', k: 'video' },
    { n: 'seminar-02.mkv', p: 'Course / Week 3', t: 'Matroska', s: '812 MB', m: '2 Sep 2026', d: '31:07', k: 'video' },
    { n: 'workshop-audio.wav', p: 'Course / Week 3', t: 'WAVE', s: '204 MB', m: '1 Sep 2026', d: '18:02', k: 'audio' },
    { n: 'slides.pdf', p: 'Course / Week 3', t: 'PDF', s: '3.1 MB', m: '1 Sep 2026', d: '—', k: 'file' },
    { n: 'notes.txt', p: 'Course / Week 3', t: 'Text', s: '4 KB', m: '28 Aug 2026', d: '—', k: 'file' },
];

export const LIBRARY: LibraryRow[] = [
    { t: 'Lecture 04 — Encoding Theory', p: '~/Videos/Course/lecture-04.mkv', d: '48:31', f: 'MKV', a: '2 Sep 2026', pl: 12 },
    { t: 'Seminar 02 — Colour Spaces', p: '~/Videos/Course/seminar-02.mkv', d: '31:07', f: 'MKV', a: '2 Sep 2026', pl: 9 },
    { t: 'Interview — draft cut', p: '~/Desktop/interview-draft.mp4', d: '22:15', f: 'MP4', a: '30 Aug 2026', pl: 3 },
    { t: 'Field Recording No. 7', p: '~/Music/Coastal/field-recording-07.flac', d: '12:48', f: 'FLAC', a: '24 Aug 2026', pl: 21 },
    { t: 'Workshop — live capture', p: '~/Videos/Workshop/live-capture.mkv', d: '1:42:08', f: 'MKV', a: '18 Aug 2026', pl: 2 },
    { t: 'Archive — 1998 transfer', p: '~/Videos/Archive/1998-transfer.avi', d: '56:20', f: 'AVI', a: '2 Aug 2026', pl: 0, missing: true },
    { t: 'Score — temp mix', p: '~/Music/Projects/temp-mix.wav', d: '4:11', f: 'WAV', a: '29 Jul 2026', pl: 6 },
    { t: 'Lecture 03 — Compression', p: '~/Videos/Course/lecture-03.mkv', d: '44:02', f: 'MKV', a: '26 Jul 2026', pl: 14 },
];

export const QUEUE: QueueItem[] = [
    { n: 'lecture-04.mkv', d: '48:31', on: true },
    { n: 'seminar-02.mkv', d: '31:07' },
    { n: 'interview-draft.mp4', d: '22:15' },
    { n: 'archive-old.mkv', d: '—', bad: true },
    { n: 'field-recording-07.flac', d: '12:48' },
];

export const PLUGINS: Plugin[] = [
    {
        id: 'subtitle',
        n: 'Subtitle Finder',
        p: 'OpenReel Community',
        v: '2.1.0',
        c: 'Subtitle provider',
        d: 'Searches configured providers for matching subtitles and loads them into the current session.',
        long:
            'Subtitle Finder searches a set of subtitle providers using the current file\'s hash, ' +
            'name, and duration, and offers the best matches. It only reads file metadata — it does ' +
            'not open your media files themselves — and it only reaches the network when you ask it to.',
        homepage: 'https://plugins.example.org/subtitle-finder',
        on: true,
        st: 'ok',
        signed: true,
        apiVersion: '1.4',
        size: '412 KB',
        installPath: '~/.local/share/openreel/plugins/subtitle-finder',
        permissions: ['network', 'read-media', 'write-config'],
        hooks: ['subtitles.provider'],
        activity: [
            { at: '14:02:10', level: 'info', msg: 'Loaded (API 1.4)' },
            { at: '13:41:22', level: 'info', msg: 'Fetched 3 results for “lecture-04.mkv”' },
            { at: '11:18:04', level: 'warn', msg: 'Provider opensubtitles.org timed out — retried' },
            { at: '09:12:00', level: 'info', msg: 'Loaded (API 1.4)' },
        ],
    },
    {
        id: 'spec',
        n: 'Spectrum Overlay',
        p: 'A. Reyes',
        v: '0.9.3',
        c: 'Visualiser',
        d: 'Draws an audio spectrum over the video surface or the audio stage.',
        long:
            'Spectrum Overlay renders a live frequency spectrum using the current audio stream. ' +
            'It can draw into the video surface or, in audio-only playback, replace the artwork ' +
            'area. It does not modify the audio itself.',
        homepage: 'https://github.com/areyes/spectrum-overlay',
        on: false,
        st: 'conflict',
        signed: false,
        apiVersion: '1.3',
        size: '188 KB',
        installPath: '~/.local/share/openreel/plugins/spectrum-overlay',
        permissions: ['audio-output', 'draw-overlay', 'write-config'],
        hooks: ['audio.visualiser'],
        activity: [
            { at: '14:02:11', level: 'warn', msg: 'Not loaded — hook "audio.visualiser" already provided by OpenReel Visualizer' },
            { at: '10:44:19', level: 'info', msg: 'Loaded (API 1.3)' },
            { at: '10:44:19', level: 'info', msg: 'Disabled by user' },
        ],
    },
    {
        id: 'viz',
        n: 'OpenReel Visualizer',
        p: 'OpenReel',
        v: '1.4.0',
        c: 'Visualiser',
        d: 'Audio-reactive visualisations for audio-only playback.',
        long:
            'The bundled visualiser ships with OpenReel and provides several audio-reactive ' +
            'scenes for audio-only playback. It reads the audio stream as it plays and draws into ' +
            'the audio stage. It can be disabled like any other plugin; the audio stage falls back ' +
            'to static artwork.',
        homepage: 'https://openreel.example.org/docs/visualizer',
        on: true,
        st: 'ok',
        signed: true,
        apiVersion: '1.4',
        size: '624 KB',
        installPath: '~/.local/share/openreel/plugins/openreel-visualizer',
        permissions: ['audio-output', 'draw-overlay', 'write-config'],
        hooks: ['audio.visualiser'],
        activity: [
            { at: '14:02:10', level: 'info', msg: 'Loaded (API 1.4)' },
            { at: '14:02:10', level: 'info', msg: 'Active provider for hook "audio.visualiser"' },
            { at: '09:12:00', level: 'info', msg: 'Loaded (API 1.4)' },
        ],
    },
    {
        id: 'av1',
        n: 'AV1 Decoder Pack',
        p: 'vendor-x',
        v: '1.0.4',
        c: 'Codec',
        d: 'Provides an additional AV1 decoding path for software playback.',
        long:
            'An alternative AV1 decoder for systems where hardware decoding is unavailable or ' +
            'unreliable. It reads media files you open and does not contact the network.',
        on: false,
        st: 'failed',
        err: 'missing symbol libav1_decode_init',
        signed: true,
        apiVersion: '1.2',
        size: '2.1 MB',
        installPath: '~/.local/share/openreel/plugins/av1-decoder-pack',
        permissions: ['read-media'],
        hooks: ['codec.av1'],
        activity: [
            { at: '14:02:11', level: 'error', msg: 'Failed to load — missing symbol libav1_decode_init' },
            { at: '14:02:11', level: 'info', msg: 'Load attempted' },
            { at: '09:12:00', level: 'error', msg: 'Failed to load — missing symbol libav1_decode_init' },
        ],
    },
    {
        id: 'rec',
        n: 'Stream Recorder',
        p: 'third-party',
        v: '3.0.0',
        c: 'Capture',
        d: 'Records network streams to disk while you watch.',
        long:
            'Stream Recorder captures network streams to a file while you watch. It reads the ' +
            'stream data and writes to your disk.',
        on: false,
        st: 'incompat',
        err: 'Requires OpenReel 1.5 or newer (you have 1.4.2)',
        signed: false,
        apiVersion: '1.5',
        size: '1.3 MB',
        installPath: '~/.local/share/openreel/plugins/stream-recorder',
        permissions: ['network', 'read-media', 'write-config'],
        hooks: ['stream.capture'],
        activity: [
            { at: '14:02:11', level: 'warn', msg: 'Not loaded — requires API 1.5, this build provides 1.4' },
        ],
    },
];

/**
 * Permission vocabulary — shared between the install confirmation and the
 * installed-plugin detail view. The "grant" text is used at install time
 * ("will be able to"); the "held" text is used afterwards ("can").
 */
export const PLUGIN_PERMISSIONS: Record<PluginPermissionId, PluginPermission> = {
    network: {
        id: 'network',
        grant: 'Connect to the internet',
        held: 'Can connect to the internet',
        risk: 'High',
    },
    'read-media': {
        id: 'read-media',
        grant: 'Read the media files you open',
        held: 'Can read the media files you open',
        risk: 'Medium',
    },
    'write-config': {
        id: 'write-config',
        grant: 'Store its own settings',
        held: 'Can store its own settings',
        risk: 'Low',
    },
    spawn: {
        id: 'spawn',
        grant: 'Run other programs on your computer',
        held: 'Can run other programs on your computer',
        risk: 'High',
    },
    'audio-output': {
        id: 'audio-output',
        grant: 'Read the audio stream while it plays',
        held: 'Can read the audio stream while it plays',
        risk: 'Medium',
    },
    'draw-overlay': {
        id: 'draw-overlay',
        grant: 'Draw its own graphics on top of the video surface',
        held: 'Can draw on top of the video surface',
        risk: 'Medium',
    },
};

export const SCENES: Scene[] = [
    { id: 'welcome', l: '1 · Welcome' },
    { id: 'empty', l: '2 · Nothing playing' },
    { id: 'open', l: '3 · Open file' },
    { id: 'video', l: '4 · Video playback' },
    { id: 'audio', l: '5 · Audio playback' },
    { id: 'tracks', l: '6 · Track menus' },
    { id: 'queue', l: '7 · Queue panel' },
    { id: 'library', l: '8 · Media library' },
    { id: 'settings', l: '9 · Settings' },
    { id: 'plugins', l: '10 · Plugin manager' },
    { id: 'install', l: '11 · Plugin install' },
    { id: 'error', l: '12 · Unsupported media' },
    { id: 'shortcuts', l: '13 · Shortcuts' },
    { id: 'about', l: '14 · About & diagnostics' },
    { id: 'loading', l: '15 · Loading / buffering' },
    { id: 'offline', l: '16 · Offline stream' },
];
