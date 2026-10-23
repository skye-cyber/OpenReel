import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],

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
        cors: {
            // origin: 'http://localhost:4043',
        },
    },

    // Expose VITE_* and TAURI_ENV_* to the client.
    envPrefix: ['VITE_', 'TAURI_ENV_*'],

    build: {
        // Chromium (Windows) vs WebKit (macOS/Linux) targets.
        target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'es2022',
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
    optimizeDeps: {
        esbuildOptions: {
            target: 'es2022',
        },
    },
    resolve: {
        alias: {
            '@': resolve(import.meta.dirname, 'src/'),
        },
    }
});
