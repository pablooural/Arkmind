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

import { afterEach } from "vitest";

afterEach(() => {
  // Limpieza común: borrar localStorage entre tests.
  localStorage.clear();
});