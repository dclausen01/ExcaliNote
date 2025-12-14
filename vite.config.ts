import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            sourcemap: true,
            outDir: 'dist-electron',
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            sourcemap: 'inline',
            outDir: 'dist-electron',
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@electron': path.resolve(__dirname, './electron'),
      // PouchDB: Alle Imports zur Browser-Version umleiten
      'pouchdb': 'pouchdb-browser',
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});
