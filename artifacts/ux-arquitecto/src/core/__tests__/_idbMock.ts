/**
 * _idbMock.ts
 *
 * T-047: helper compartido para mockear IndexedDB en tests del core.
 * Es un mock liviano (no usa fake-indexeddb). Sirve para los stores
 * que usan transacciones simples (put/get/delete/getAll).
 *
 * No cubre todos los casos de IDB. Si un test necesita features más
 * complejos (cursors, índices múltiples), cambiar a `fake-indexeddb`.
 */

type Store = Map<string, any>;

export class IDBMock {
  private stores: Map<string, Store> = new Map();
  name: string;
  version: number;

  constructor(name = "test-db", version = 1) {
    this.name = name;
    this.version = version;
  }

  // ─── Store helpers ───────────────────────────────────────────────
  private getOrCreate(name: string): Store {
    let s = this.stores.get(name);
    if (!s) {
      s = new Map();
      this.stores.set(name, s);
    }
    return s;
  }

  // ─── Mock de IDBDatabase ─────────────────────────────────────────
  transaction(storeNames: string | string[]) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const txn = {
      _stores: names.map((n) => this.getOrCreate(n)),
      _storeNames: names,
      objectStore(name: string) {
        const idx = names.indexOf(name);
        if (idx === -1) throw new Error(`Store ${name} not in txn`);
        return new ObjectStoreMock(this._stores[idx]);
      },
      oncomplete: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      onabort:    null as null | ((e: any) => void),
      _complete() {
        if (this.oncomplete) this.oncomplete();
      },
    };
    // Simular complete async
    Promise.resolve().then(() => txn._complete());
    return txn;
  }

  // Para inspección en tests
  _dump() {
    const out: Record<string, any[]> = {};
    this.stores.forEach((store, name) => {
      out[name] = Array.from(store.values());
    });
    return out;
  }
}

class ObjectStoreMock {
  constructor(private store: Store) {}

  put(value: any) {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     undefined as any,
    };
    const key = value.id ?? (this.store.size + 1).toString();
    this.store.set(String(key), value);
    req.result = key;
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }

  get(key: string) {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     this.store.get(String(key)),
    };
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }

  getAll() {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     Array.from(this.store.values()),
    };
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }

  delete(key: string) {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     undefined,
    };
    this.store.delete(String(key));
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }

  clear() {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     undefined,
    };
    this.store.clear();
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }
}

/**
 * Helper para instalar el mock global antes de los tests.
 * Uso:
 *   import { installIDBMock } from "./_idbMock";
 *   beforeEach(() => installIDBMock());
 */
export function installIDBMock(name?: string) {
  const db = new IDBMock(name);
  (globalThis as any).__idbMock = db;

  (globalThis as any).indexedDB = {
    open(_n: string, _v?: number) {
      const req: any = {
        onsuccess:   null as null | ((e: any) => void),
        onerror:     null as null | ((e: any) => void),
        onupgradeneeded: null as null | ((e: any) => void),
        result: null as any,
      };
      Promise.resolve().then(() => {
        req.result = db;
        req.onsuccess?.({ target: req });
      });
      return req;
    },
    deleteDatabase(_n: string) {
      const req: any = {
        onsuccess: null,
        onerror:   null,
      };
      Promise.resolve().then(() => req.onsuccess?.());
      return req;
    },
  };
}