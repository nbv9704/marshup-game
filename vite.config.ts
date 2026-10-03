import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false, target: 'es2022' },
  test: { environment: 'node', include: ['tests/**/*.test.ts','src/games/**/*.test.ts','src/lan/**/*.test.ts','electron/**/*.test.ts'] }
});
