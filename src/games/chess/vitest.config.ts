import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/games/chess/rules.test.ts'] }
});
