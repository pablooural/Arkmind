/**
 * useFilesystemAccess
 *
 * Gestiona el acceso al sistema de archivos real y lo integra con el Workspace.
 *
 * Responsabilidades:
 * - Persiste el nombre de la carpeta raíz en IndexedDB (no el handle —
 *   la API no permite persistir handles entre sesiones por seguridad,
 *   pero sí podemos recordar el nombre y pedir re-autorización automática).
 * - Inicializa el WorkspaceManager con la raíz elegida.
 * - Expone estado global: isReady, rootName, requestAccess, releaseAccess.
 *
 * Uso:
 *   const { isReady, rootName, requestAccess } = useFilesystemAccess();
 */

import { useState, useEffect, useCallback } from "react";
import { filesystemManager } from "@/core/filesystem";
import { workspaceManager } from "@/core";

// ─── Persistencia simple en IndexedDB ─────────────────────────────────────────

const DB_NAME = "arkiserver_fs";
const DB_VERSION = 1;
const STORE = "session";
const KEY_ROOT = "rootName";
const KEY_WORKSPACE = "workspaceId";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function dbSet(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn(`[useFilesystemAccess] Failed to persist ${key}:`, error);
  }
}

async function dbDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn(`[useFilesystemAccess] Failed to delete ${key}:`, error);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseFilesystemAccessReturn {
  /** ¿Hay una carpeta raíz activa y con permiso? */
  isReady: boolean;
  /** ¿Está el browser cargando o pidiendo permiso? */
  isLoading: boolean;
  /** Nombre de la carpeta raíz (vacío si no hay ninguna) */
  rootName: string;
  /** ¿Soporta este browser la File System Access API? */
  isSupported: boolean;
  /** Mensaje de error si algo falló */
  error: string | null;
  /**
   * Abre el picker del sistema de archivos.
   * Si el usuario elige una carpeta, inicializa el workspace y persiste el nombre.
   */
  requestAccess: () => Promise<boolean>;
  /**
   * Libera el acceso actual y limpia la persistencia.
   * Útil para "cambiar carpeta".
   */
  releaseAccess: () => Promise<void>;
}

export function useFilesystemAccess(): UseFilesystemAccessReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true al inicio mientras cargamos de DB
  const [rootName, setRootName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isSupported = filesystemManager.isSupported();

  // ── Al montar: intentar restaurar sesión anterior ────────────────────────

  useEffect(() => {
    async function restoreSession() {
      if (!isSupported) {
        setIsLoading(false);
        return;
      }
      try {
        const saved = await dbGet(KEY_ROOT);
        if (saved) {
          // Hay una sesión previa. La File System Access API requiere re-autorización
          // manual (no podemos reusar el handle automáticamente), así que mostramos
          // el nombre guardado y pedimos al usuario que re-autorice con un click.
          setRootName(saved);
          // No ponemos isReady=true todavía — el handle no existe todavía.
          // El FileExplorer mostrará "Re-abrir [nombre]" en lugar de "Abrir carpeta".
        }
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, [isSupported]);

  // ── requestAccess ────────────────────────────────────────────────────────

  const requestAccess = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Este browser no soporta la File System Access API. Usá Chrome o Edge 86+.");
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const name = await filesystemManager.requestAccess();
      if (!name) {
        setError("No se eligió ninguna carpeta.");
        return false;
      }

      // Inicializar (o re-inicializar) el workspace
      const wsId = (await dbGet(KEY_WORKSPACE)) ?? `ws_${Date.now()}`;
      workspaceManager.initializeWorkspace(wsId, name, "/");

      // Persistir
      await dbSet(KEY_ROOT, name);
      await dbSet(KEY_WORKSPACE, wsId);

      setRootName(name);
      setIsReady(true);
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // ── releaseAccess ────────────────────────────────────────────────────────

  const releaseAccess = useCallback(async (): Promise<void> => {
    await dbDelete(KEY_ROOT);
    await dbDelete(KEY_WORKSPACE);
    setIsReady(false);
    setRootName("");
  }, []);

  return {
    isReady,
    isLoading,
    rootName,
    isSupported,
    error,
    requestAccess,
    releaseAccess,
  };
}
