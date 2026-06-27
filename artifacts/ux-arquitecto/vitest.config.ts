/**
 * vitest.config.ts
 *
 * T-047: configuración de vitest para tests del core.
 * Setup:
 * - happy-dom para tests que requieren DOM
 * - alias @/ → src/
 * - include solo archivos *.test.ts(x)
 * - exclude build, dist, node_modules
 */

import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@/": path.resolve(__dirname, "src/"),
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "build", "dist", "**/*.e2e.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      include: ["src/core/**/*.ts"],
      exclude: [
        "src/core/index.ts",
        "src/core/types.ts",
        "src/core/__tests__/**",
        "src/**/*.d.ts",
      ],
      thresholds: {
        lines:   70,
        branches: 60,
        functions: 70,
        statements: 70,
      },
    },
  },
});