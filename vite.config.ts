import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electronSimple from 'vite-plugin-electron/simple';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const electron = electronSimple as unknown as (opts: any) => any;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: [
                'better-sqlite3',
                'electron',
                'electron-updater',
                'fs', 'path', 'url', 'module', 'crypto',
                'stream', 'util', 'os', 'events', 'buffer',
                'child_process', 'assert',
                'node:fs', 'node:path', 'node:url', 'node:module',
                'node:crypto', 'node:stream', 'node:util',
                'node:os', 'node:events', 'node:buffer',
                'node:child_process', 'node:assert',
              ],
            },
          },
        },
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});