# OpenReel

Desktop media player for Linux and other desktop platforms. React 18 + TypeScript + Vite 5 + Tailwind v4, wrapped in a Tauri 2 shell with a bundled FFmpeg/FFprobe sidecar.

## Requirements

- **Node** 20 or later
- **Rust** stable toolchain (via rustup)
- **Linux build dependencies**:

    sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev \
      libayatana-appindicator3-dev librsvg2-dev patchelf \
      libasound2-dev vainfo

- **FFmpeg/FFprobe sidecars** — fetched automatically by npm install (see *Sidecars* below)

## Quick start

    npm install
    npm run dev:react      # browser-only preview at :4043
    npm run dev:tauri      # full desktop app with Rust backend
    npm run build          # type-check + build React + build Tauri
    npm run typecheck      # tsc --noEmit

## Stack

| Layer | What |
|---|---|
| **UI** | React 18, function components, hooks, a single PlayerContext for playback state |
| **Types** | TypeScript strict, noUncheckedIndexedAccess, verbatimModuleSyntax |
| **Bundler** | Vite 5 with @vitejs/plugin-react |
| **Styles** | Tailwind v4 via @tailwindcss/vite — no tailwind.config.js; tokens live in src/styles/styles.css inside @theme, primitives declared with @utility |
| **Desktop** | Tauri 2 with tauri-plugin-single-instance, tauri-plugin-shell, tauri-plugin-dialog, tauri-plugin-store, tauri-plugin-opener |
| **Media** | Browser video element for playback, FFmpeg sidecar for container/codec transcoding and stream extraction |

## Project layout

    src/
    ├── App.tsx
    ├── main.tsx
    ├── types.ts
    ├── components/
    │   ├── Button.tsx, Chip.tsx, Switch.tsx, Segment.tsx, Field.tsx
    │   ├── Menu.tsx, Modal.tsx, Toast.tsx, Live.tsx
    │   ├── TitleBar.tsx, Sidebar.tsx, StatusStrip.tsx
    │   ├── ContextMenu/
    │   │   ├── Menu.tsx, ItemRow.tsx, Submenu.tsx
    │   ├── Transport/
    │   │   ├── Default.tsx, Fullscreen.tsx, Row.tsx, Pill.tsx, Bar.tsx
    │   ├── Plugins/
    │   │   ├── Available.tsx, Conflict.tsx, Details.tsx, Empty.tsx
    │   │   ├── PluginList.tsx, RepositoryInstall.tsx, Row.tsx, shared.tsx
    │   ├── Settings/
    │   │   ├── AdvancedPanel.tsx, AppearancePanel.tsx, AudioPanel.tsx
    │   │   ├── LibraryPanel.tsx, Panel.tsx, PlaybackPanel.tsx
    │   │   ├── PluginsPanel.tsx, PrivacyPanel.tsx, SearchResults.tsx
    │   │   ├── Shared.tsx, Sidenav.tsx, SubtitlePanel.tsx, VideoPanel.tsx
    │   │   └── subtitle/
    │   │       ├── shared.ts, Subtitle.tsx
    │   ├── Library/Row.tsx
    │   ├── Media/Card.tsx, subcmp.tsx
    │   ├── LibraryGrid.tsx, MediaInfo.tsx, SubtitleOverlay.tsx
    │   ├── QueuePanel.tsx, UrlDialog.tsx, DropOverlay.tsx
    │   ├── CrashRecoveryModal.tsx, ErrorBoundary.tsx, mediaButton.tsx
    ├── data/mock.ts
    ├── helpers/
    │   ├── herpers.ts, library.ts, media.ts, persist.ts, url.ts
    ├── hooks/
    │   ├── mkvsource/
    │   │   ├── assembler.ts, buffer.ts, markup.ts
    │   ├── player.ts, useContextMenu.ts, useDragDrop.ts
    │   ├── useFocus.ts, useKeyboardShortcuts.ts
    │   ├── useMkvSource.ts, useSubtitleCues.ts
    ├── lib/
    │   ├── bus/
    │   │   ├── busEventPromise.ts, busMiddleware.ts
    │   │   ├── bustypes.ts, busWeakRefs.ts, eventBus.ts
    │   ├── format.ts, Icons.tsx, mediaPath.ts, Permission.ts, Scene.ts, startup.ts
    │   ├── platform/
    │   │   ├── fs.ts, library.ts, plugins.ts, session.ts, shell.ts, system.ts, transcode.ts
    │   │   └── system/
    │   │       ├── browser.ts, Crash.ts, shared.ts, tools.ts
    │   └── subtitles/vtt.ts
    ├── state/
    │   ├── EmptyState.tsx, persistSettings.ts, PlayerContext.tsx
    │   └── utils/
    │       ├── shared.ts, validator.ts
    ├── styles/styles.css
    ├── types/
    │   ├── contextmenu.ts, library.ts, media.ts, mkvSource.ts
    │   ├── persists.ts, platform.ts, player.ts, plugins.ts
    │   ├── settings.ts, urldg.ts
    └── views/
        ├── About.tsx, AudioStage.tsx, ErrorStage.tsx, index.tsx
        ├── Library.tsx, NowPlaying.tsx, Plugins.tsx
        ├── Settings.tsx, Shortcuts.tsx, VideoStage.tsx, Welcome.tsx

    src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/default.json
    ├── binaries/                 # gitignored, populated by prepare-sidecars
    │   ├── openreel-ffmpeg-<triple>
    │   └── openreel-ffprobe-<triple>
    ├── linux/openreel.desktop    # custom template, Exec=openreel %U
    └── src/
        ├── main.rs, lib.rs
        ├── paths.rs              # ~/.openreel layout — single source of truth
        ├── http_server.rs        # axum loopback server for media streaming
        ├── stream_protocol.rs    # (unused, superseded by http_server)
        ├── state.rs
        └── commands/
            ├── mod.rs
            ├── system.rs, session.rs, settings.rs, startup.rs
            ├── fs.rs, shell.rs, library.rs
            ├── transcode.rs, cache.rs, plugins.rs, audio.rs

## User data layout

All state lives under ~/.openreel/, resolved by paths.rs. The installed app never writes outside it.

    ~/.openreel/
    ├── config/settings.json     # PersistedPrefs
    ├── state/session.json       # crash marker
    ├── state/safe-mode.flag
    ├── library/index.json       # scanned file list + per-folder counts
    ├── plugins/state.json
    ├── positions.json
    ├── transcode/               # {key}.mp4, {key}.aN.mp4, {key}.vN.mp4, {key}.sN.vtt
    └── logs/openreel.log

Cache sweep runs on startup: delete files older than 7 days, then trim oldest-first until under 5 GB. Never touches files younger than 24 hours.

## Media playback pipeline

1. **File selection** — native dialog, drag-drop, file association, or CLI argv → normalized absolute path.
2. **URL conversion** — toMediaUrl(path) produces http://127.0.0.1:PORT/stream?path=<encoded>. The loopback HTTP server serves the file with range support.
3. **Transcode decision** — .mkv sources are always transcoded (WebKitGTK cannot demux MKV). H.264/HEVC video and AAC/MP3 audio are stream-copied. Other codecs fall back to -c:v libx264 -c:a aac.
4. **Progress** — prepare_transcode emits progress via a Tauri Channel. Video stage shows the overlay.
5. **Multi-stream extraction** — after the main transcode, alternate audio/video/subtitle tracks extract with -c copy. Bitmap subtitles (PGS, DVD) are skipped.
6. **Playback** — video element keyed on media.id + media.url forces a clean remount on URL change. Track selection swaps media.url in the queue item by id; position preserved via pendingSeekRef.
7. **Subtitles** — SubtitleOverlay fetches the selected track's VTT via useSubtitleCues.

Transcode concurrency capped at 2 via a semaphore. In-flight map keyed by (path, mtime, size) hash attaches duplicate requests to the existing job. Cancellation sets an AtomicBool the progress loop checks.

## Theming

Both themes are declared in src/styles/styles.css:

- @theme { --color-…: … } — dark, default.
- [data-theme="light"] { … } — light, overrides the same names.

Tailwind v4 turns each --color-x into bg-x, text-x, border-x, etc. Toggling data-theme on the html element swaps the entire app. Theme preference is PersistedPrefs.themePref ('system' | 'light' | 'dark').

Reduced motion follows prefers-reduced-motion unless overridden in Settings → Appearance. Applied via data-motion="reduced" on the html element.

## Component primitives

Repeated patterns that can't be a single Tailwind class are declared with @utility in styles.css (btn-base, chip-base, nav-base, row-base, animate-*). They compose freely with Tailwind utilities at the call site.

## Settings

One Settings object in PlayerContext, persisted via tauri-plugin-store (browser: localStorage) with a versioned schema and field-by-field validation. Every settings row shows a dot when it differs from DEFAULT_SETTINGS and a per-row Reset action. Settings → Advanced has a "Reset all settings" that force-overwrites settings.json with defaults that include platform-detected media folders.

Settings are searchable across all categories.

## Plugins

Optional extensions. The core player is fully functional with every plugin disabled.

- **Installed list** — name, provider, version, category chip, status, enable switch, details.
- **Detail view** — description, permission table with per-permission risk, hooks, activity log, technical block, uninstall.
- **Conflicts** — detected by hook; conflict panel lets the user choose which plugin stays active.
- **Install from repository** — repository browser, install confirmation modal with plain-language permissions and unsigned-package acknowledgement.
- **Safe mode** — SessionCrashManager detects two unclean exits within 60 seconds and starts in safe mode. Safe mode disables all plugins (pluginsActuallyEnabled = settings.pluginsEnabled && !safeMode), shows a title-bar chip, and offers a recovery modal.

## Keyboard shortcuts

Transport, seeking, volume, mute, speed, tracks, subtitles, queue, view jumps, search focus, fullscreen, shortcut reference, diagnostics. Full reference at F1. Shortcuts suppressed while a text field has focus; Escape always works.

## Building and packaging

    npm run build                                          # full build
    npm run tauri build -- --bundles deb                   # .deb only
    npm run tauri build -- --bundles deb,rpm,appimage      # all Linux bundles

Bundles are written to src-tauri/target/release/bundle/.

### Sidecars

`openreel-ffmpeg` and `openreel-ffprobe` are bundled as Tauri sidecars (`externalBin`), gitignored, and fetched per-platform by scripts/prepare-sidecars.sh (Linux/macOS) and scripts/prepare-sidecars.ps1 (Windows). npm install triggers `npm run prepare:sidecars`, which is a no-op if the binaries are already present.

At runtime, the app resolves them via `std::env::current_exe().parent()`. This works in dev (target/debug/) and after install (`/usr/bin/`).

**Build dependency**: cpal requires `libasound2-dev` / `alsa-lib-devel`; the Debian/RPM package depends on `vainfo`.

### Linux packaging notes

- src-tauri/linux/openreel.desktop is a custom desktopTemplate with `Exec=openreel %U (not %f` — Linux file managers pass `file:// URLs`).
- `MimeType=` in the desktop file lists every supported format, both canonical and `x-` variants.
- commands/startup.rs::normalize_launch_path decodes file:// URLs and resolves relative paths against the process cwd.
- bundle.fileAssociations in tauri.conf.json covers macOS CFBundleDocumentTypes and Windows registry associations.

### Release workflow

`.github/workflows/release.yml` uses tauri-action. On tag push, it builds for ubuntu-latest / macos-latest / windows-latest, fetches sidecars first, and creates a draft release. Linux uses --bundles deb,rpm,appimage; macOS and Windows use their default bundles. prerelease is derived from the tag.

## Screens

The title bar has a **Screens** menu for design review. It flips the app through the spec's states. Remove SCENES and the menu before shipping.

## Type-checking

    npm run typecheck

Runs tsc --noEmit against src/. The full npm run build chains type-check → vite build → tauri build.

## Known issues and deferred work

- **Bitmap subtitles** (PGS, DVD) extracted to empty VTT files appear in the subtitle menu but render nothing.
- **No disk space check** before transcode dispatch.
- **Navigate-away does not cancel** an in-flight transcode — only explicit close does.
- **Plugin uninstall, queue, and playback position** do not persist across reload.
- **Audio device selection** (cpal Phase 1) stores the choice but does not route audio yet.
- **System caption style** is not implemented; the setting's true effect is "hide subtitles."
- **HEVC-in-MP4** may not play on Linux depending on the WebKitGTK build and available GStreamer plugins.
- **macOS warm-start file opens** (RunEvent::Opened) are not handled.
