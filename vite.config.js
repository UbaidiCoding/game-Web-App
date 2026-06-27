// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Serve from project root so /assets/* paths resolve correctly
  root: '.',
  base: './',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@scenes':   path.resolve(__dirname, 'scenes'),
      '@objects':  path.resolve(__dirname, 'objects'),
      '@managers': path.resolve(__dirname, 'managers'),
      '@utils':    path.resolve(__dirname, 'utils'),
      '@config':   path.resolve(__dirname, 'config'),
    },
  },

  server: {
    port: 3000,
    open: true,
    // Allow HMR to reach the dev server from local network (useful for mobile testing)
    host: true,
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Phaser 3 is chunky; raise the warning threshold so CI doesn't cry
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Phaser into its own chunk for better caching
          phaser: ['phaser'],
        },
      },
    },
  },

  // Phaser uses global `WEBGL_lose_context` and similar; keep globals intact
  optimizeDeps: {
    include: ['phaser'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
});