/**
 * test-setup.ts
 *
 * T-047: setup global para vitest.
 * Se ejecuta antes de cada archivo de test.
 *
 * Las IAs pueden agregar:
 * - beforeEach(() => installIDBMock()) si el test necesita IDB.
 * - mocks de fetch, navigator, etc.
 */

import { afterEach, beforeAll } from "vitest";

// Mock localStorage for node environment
beforeAll(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    } as Storage;
  }
});

afterEach(() => {
  // Limpieza común: borrar localStorage entre tests.
  globalThis.localStorage?.clear();
});