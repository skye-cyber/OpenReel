/**
 * Plugin repository access — platform boundary.
 *
 * TODO(tauri): replace simulated fetch with a real network call
 * (`invoke('fetch_repository', { url })`) that parses a JSON manifest
 * and validates signatures. The catalog shape below is the contract
 * between the app and whatever the backend returns.
 */
import type {
    Repository,
    RepositoryCatalog,
    RepositoryPlugin,
} from '../../types/plugins';

/* ============================================================
 *  Simulated catalogs — one per known repository
 *  ============================================================ */
const CATALOGS: Record<string, RepositoryPlugin[]> = {
    'community': [
        {
            id: 'community:subtitle-finder',
            name: 'Subtitle Finder',
            provider: 'OpenReel Community',
            version: '2.1.0',
            category: 'Subtitle provider',
            description: 'Searches subtitle providers and loads matches into the current session.',
            longDescription:
                'Subtitle Finder searches a set of subtitle providers using the current file\'s hash, ' +
                'name, and duration, and offers the best matches. It only reads file metadata — it does ' +
                'not open your media files themselves — and it only reaches the network when you ask it to.',
            homepage: 'https://plugins.example.org/subtitle-finder',
            permissions: ['network', 'read-media', 'write-config'],
            apiVersion: '1.4',
            hooks: ['subtitles.provider'],
            size: '412 KB',
            signed: true,
            compatibility: { ok: true },
        },
        {
            id: 'community:spectrum-overlay',
            name: 'Spectrum Overlay',
            provider: 'A. Reyes',
            version: '0.9.4',
            category: 'Visualiser',
            description: 'Draws an audio spectrum over the video surface or the audio stage.',
            longDescription:
                'Spectrum Overlay renders a live frequency spectrum using the current audio stream. ' +
                'It can draw into the video surface or, in audio-only playback, replace the artwork area. ' +
                'It does not modify the audio itself.',
            homepage: 'https://github.com/areyes/spectrum-overlay',
            permissions: ['audio-output', 'draw-overlay', 'write-config'],
            apiVersion: '1.3',
            hooks: ['audio.visualiser'],
            size: '188 KB',
            signed: false,
            compatibility: { ok: true },
        },
        {
            id: 'community:equalizer',
            name: 'Parametric Equalizer',
            provider: 'OpenReel Community',
            version: '1.0.2',
            category: 'Audio',
            description: 'Adds a 10-band parametric EQ to the audio output chain.',
            longDescription:
                'A 10-band parametric equaliser with adjustable centre frequencies, Q, and gain per band. ' +
                'Settings are saved per output device.',
            permissions: ['audio-output', 'write-config'],
            apiVersion: '1.4',
            hooks: ['audio.filter'],
            size: '96 KB',
            signed: true,
            compatibility: { ok: true },
        },
        {
            id: 'community:media-keys',
            name: 'Extended Media Keys',
            provider: 'OpenReel Community',
            version: '1.2.0',
            category: 'Integration',
            description: 'Adds support for keyboard multimedia keys on Wayland sessions.',
            longDescription:
                'Registers the standard media keys (play/pause, next, previous, volume) via the ' +
                'Wayland global shortcuts portal. On X11 sessions the core app already handles these.',
            permissions: ['write-config'],
            apiVersion: '1.4',
            hooks: ['input.mediakeys'],
            size: '48 KB',
            signed: true,
            compatibility: { ok: false, reason: 'Requires Wayland session (X11 detected)' },
        },
    ],
    'extras': [
        {
            id: 'extras:stream-recorder',
            name: 'Stream Recorder',
            provider: 'third-party',
            version: '3.1.0',
            category: 'Capture',
            description: 'Records network streams to disk while you watch.',
            longDescription:
                'Stream Recorder captures network streams to a file while you watch. It reads the ' +
                'stream data and writes to your disk.',
            permissions: ['network', 'read-media', 'write-config'],
            apiVersion: '1.5',
            hooks: ['stream.capture'],
            size: '1.3 MB',
            signed: false,
            compatibility: { ok: false, reason: 'Requires OpenReel 1.5 or newer' },
        },
        {
            id: 'extras:chapter-editor',
            name: 'Chapter Editor',
            provider: 'third-party',
            version: '0.6.1',
            category: 'Editing',
            description: 'Adds a chapter editor for local media files.',
            longDescription:
                'Edits the chapter markers inside MKV files. Requires write access to the media file.',
            permissions: ['read-media', 'write-config'],
            apiVersion: '1.3',
            hooks: ['media.edit'],
            size: '320 KB',
            signed: false,
            compatibility: { ok: true },
        },
    ],
};

const KNOWN_REPOSITORIES: Record<string, Repository> = {
    'community': {
        id: 'community',
        label: 'OpenReel Community',
        url: 'https://plugins.example.org/repository.json',
        lastFetchedAt: null,
    },
    'extras': {
        id: 'extras',
        label: 'Third-party Extras',
        url: 'https://extras.example.org/index.json',
        lastFetchedAt: null,
    },
};

export const KNOWN_REPOSITORY_CHOICES: Repository[] = [
    KNOWN_REPOSITORIES['community']!,
    KNOWN_REPOSITORIES['extras']!,
];

/* ============================================================
 *  Fetch one repository
 *  ============================================================ */
export async function fetchRepository(
    repository: Repository,
): Promise<RepositoryCatalog> {
    // Simulate network latency.
    await new Promise(r => setTimeout(r, 800));

    const catalog = CATALOGS[repository.id];
    if (!catalog) {
        throw new Error(`Repository "${repository.label}" is unavailable`);
    }

    return {
        repository: { ...repository, lastFetchedAt: Date.now() },
        plugins: catalog,
        fetchedAt: Date.now(),
    };
}

/* ============================================================
 *  Fetch several — used by "check all" flows
 *  ============================================================ */
export async function fetchAllRepositories(
    repositories: Repository[],
): Promise<{ catalogs: RepositoryCatalog[]; errors: Array<{ repository: Repository; error: string }> }> {
    const results = await Promise.allSettled(
        repositories.map(r => fetchRepository(r)),
    );

    const catalogs: RepositoryCatalog[] = [];
    const errors: Array<{ repository: Repository; error: string }> = [];

    results.forEach((result, i) => {
        const repo = repositories[i];
        if (!repo) return;
        if (result.status === 'fulfilled') catalogs.push(result.value);
        else errors.push({ repository: repo, error: String(result.reason) });
    });

    return { catalogs, errors };
}
