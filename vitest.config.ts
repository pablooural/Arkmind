import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'Arkmind-main/Arkmind-main/artifacts/ux-arquitecto/src/**/*.test.{ts,tsx}',
      'Arkmind-main/Arkmind-main/artifacts/ux-arquitecto/src/**/*.spec.{ts,tsx}'
    ],
    exclude: [
      '**/useSession.event.test.tsx',
      '**/node_modules/**'
    ]
  }
});
