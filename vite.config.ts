import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

const host = process.env.TAURI_DEV_HOST;

/**
 * Serve local media files under /media/* so <video src="/media/...">
 * works from the dev server. Reads from a fixed directory on disk.
 *
 * Change MEDIA_ROOT to point at wherever your media lives.
 */
 const MEDIA_ROOT = '/home/skye/Videos/';

 function mediaServer() {
     return {
         name: 'media-server',
         configureServer(server: any) {
             server.middlewares.use('/media', (req: any, res: any) => {
                 const rawPath = (req.url || '').split('?')[0] || '';
                 const rel = decodeURIComponent(rawPath).replace(/^\/+/, '');

                 // Path traversal guard.
                 if (rel.includes('..')) {
                     res.statusCode = 400;
                     res.end('Bad request');
                     return;
                 }

                 const filePath = path.join(MEDIA_ROOT, rel);
                 fs.stat(filePath, (err, stat) => {
                     if (err || !stat.isFile()) {
                         res.statusCode = 404;
                         res.end('Not found');
                         return;
                     }

                     const ext = path.extname(filePath).toLowerCase();
                     const types: Record<string, string> = {
                         '.webm': 'video/webm',
                         '.mp4': 'video/mp4',
                         '.mkv': 'video/x-matroska',
                         '.ogg': 'video/ogg',
                         '.mp3': 'audio/mpeg',
                         '.flac': 'audio/flac',
                         '.wav': 'audio/wav',
                         '.m4a': 'audio/mp4',
                     };
                     const type = types[ext] ?? 'application/octet-stream';
                     res.setHeader('Content-Type', type);
                     res.setHeader('Accept-Ranges', 'bytes');

                     // Range requests — required for seeking.
                     const range = req.headers.range;
                     if (range) {
                         const match = /bytes=(\d*)-(\d*)/.exec(range);
                         const start = match?.[1] ? parseInt(match[1], 10) : 0;
                         const end = match?.[2] ? parseInt(match[2], 10) : stat.size - 1;
                         res.statusCode = 206;
                         res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
                         res.setHeader('Content-Length', end - start + 1);
                         fs.createReadStream(filePath, { start, end }).pipe(res);
                     } else {
                         res.setHeader('Content-Length', stat.size);
                         res.statusCode = 200;
                         fs.createReadStream(filePath).pipe(res);
                     }
                 });
             });
         },
     };
 }

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss(), mediaServer()],

    // Relative base so assets resolve correctly inside the Tauri webview.
    base: './',

    // Tauri expects a fixed port and fails if it's unavailable.
    clearScreen: false,
    server: {
        // open: true,
        port: 4043,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: 'ws',
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            // Don't let Vite watch Rust/Tauri build artifacts.
            ignored: ['**/src-tauri/**'],
        },
    },

    // Expose VITE_* and TAURI_ENV_* to the client.
    envPrefix: ['VITE_', 'TAURI_ENV_*'],

    build: {
        // Chromium (Windows) vs WebKit (macOS/Linux) targets.
        target:
            process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
        minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
        sourcemap: !!process.env.TAURI_ENV_DEBUG,

        // Match tauri.conf.json -> build.frontendDist
        outDir: resolve(import.meta.dirname, 'build'),
        emptyOutDir: true,

        rollupOptions: {
            input: resolve(import.meta.dirname, 'index.html'),
            output: {
                entryFileNames: 'assets/[name]-[hash].js',
                chunkFileNames: 'assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
            // manualChunks: {
            //     'vendor-react': ['react', 'react-dom'],
            //     'vendor-tauri': [
            //         '@tauri-apps/api',
            //         '@tauri-apps/plugin-opener',
            //         '@tauri-apps/plugin-dialog',
            //         '@tauri-apps/plugin-fs',
            //         '@tauri-apps/plugin-store',
            //         '@tauri-apps/plugin-shell',
            //     ],
            // },
        },
    },

    resolve: {
        alias: {
            '@': resolve(import.meta.dirname, 'src/'),
        },
    }
});
