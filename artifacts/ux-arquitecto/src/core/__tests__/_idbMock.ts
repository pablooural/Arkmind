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
  objectStoreNames: { contains: (n: string) => boolean; [Symbol.iterator]: () => IterableIterator<string> } = {
    contains: (n: string) => this.stores.has(n),
    [Symbol.iterator]: function* (this: { stores: Map<string, Store> }) {
      yield* Array.from(this.stores.keys());
    }.bind({ stores: this.stores }) as any,
  };

  createObjectStore(name: string, opts?: { keyPath?: string }) {
    const store = this.getOrCreate(name);
    const mock = new ObjectStoreMock(store);
    mock.keyPath = opts?.keyPath ?? null;
    // We need to keep a reference to the mock per-store so createIndex works.
    this.storeMocks.set(name, mock);
    return mock;
  }

  private storeMocks: Map<string, ObjectStoreMock> = new Map();

  transaction(storeNames: string | string[]) {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const txn = {
      _storeNames: names,
      objectStore(name: string) {
        let mock = this._storeMocks?.get(name);
        if (!mock) {
          // Create a transient mock for stores that exist as data but no mock registered
          let store = this._stores?.get(name);
          if (!store) {
            store = new Map();
            this._stores?.set(name, store);
          }
          mock = new ObjectStoreMock(store);
          this._storeMocks?.set(name, mock);
        }
        return mock;
      },
      _stores: this.stores,
      _storeMocks: this.storeMocks,
      oncomplete: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      onabort:    null as null | ((e: any) => void),
      _complete() {
        if (this.oncomplete) this.oncomplete();
      },
    };
    Promise.resolve().then(() => txn._complete());
    return txn;
  }

  close() {
    // No-op in mock
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
  /** Declared indexes in this store (set by createIndex in onupgradeneeded). */
  private indexes: Map<string, { keyPath: string; unique: boolean }> = new Map();
  /** Keys declared as keyPath when the store was created. */
  public keyPath: string | null = null;

  constructor(private store: Store) {}

  // Helper to compute the primary key from a value (if keyPath set)
  private computeKey(value: any): string {
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (!this.keyPath) return (this.store.size + 1).toString();
    const v = value[this.keyPath];
    if (v === undefined || v === null) return (this.store.size + 1).toString();
    return String(v);
  }

  createIndex(name: string, keyPath: string, opts?: { unique?: boolean }) {
    this.indexes.set(name, { keyPath, unique: opts?.unique ?? false });
    return { name, keyPath };
  }

  index(name: string) {
    const def = this.indexes.get(name);
    if (!def) throw new Error(`No index ${name} on store`);
    return new IndexMock(this.store, def.keyPath);
  }

  put(value: any) {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     undefined as any,
    };
    const key = this.computeKey(value);
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

  getAllKeys() {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     Array.from(this.store.keys()),
    };
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }

  count() {
    const req: any = {
      onsuccess: null as null | (() => void),
      onerror:    null as null | ((e: any) => void),
      result:     this.store.size,
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

class IndexMock {
  constructor(private store: Store, private keyPath: string) {}

  getAll(value?: any) {
    const matches: any[] = [];
    this.store.forEach((v) => {
      if (value === undefined || v[this.keyPath] === value) {
        matches.push(v);
      }
    });
    const req: any = {
      onsuccess: null,
      onerror:   null,
      result:    matches,
    };
    Promise.resolve().then(() => req.onsuccess?.());
    return req;
  }

  getAllKeys(value?: any) {
    const matches: string[] = [];
    this.store.forEach((v, k) => {
      if (value === undefined || v[this.keyPath] === value) {
        matches.push(k);
      }
    });
    const req: any = {
      onsuccess: null,
      onerror:   null,
      result:    matches,
    };
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
      // Simulate upgradeneeded → success
      Promise.resolve().then(() => {
        req.result = db;
        req.onupgradeneeded?.({ target: req });
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