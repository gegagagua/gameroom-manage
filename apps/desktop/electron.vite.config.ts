import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

// @grm/shared is TypeScript source inside the monorepo → it must be bundled, never externalized.
const bundleShared = { externalizeDeps: { exclude: ['@grm/shared'] } };

export default defineConfig({
  main: { build: bundleShared },
  preload: { build: bundleShared },
  renderer: {
    plugins: [react()],
  },
});
