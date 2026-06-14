/**
 * Filesystem Abstraction Layer
 * Delega al WebFilesystemProvider (File System Access API).
 *
 * CAMBIO: Los métodos TODO ahora usan el provider real.
 * La arquitectura de transacciones se mantiene intacta.
 */

import { FileNode } from "./types";
import { transactionManager } from "./transactions";
import { webFilesystemProvider } from "./WebFilesystemProvider";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

export interface FileSystemResult {
  success: boolean;
  path: string;
  size?: number;
  content?: string;
  error?: string;
}

const SUPPORTED_FORMATS = {
  text: ["txt", "md"],
  code: ["ts", "tsx", "js", "jsx", "json", "css", "html", "yaml", "yml", "sh", "env"],
  data: ["json", "yaml", "yml", "csv"],
} as const;

// ─── Manager ──────────────────────────────────────────────────────────────────

export class FilesystemManager {

  // ── Acceso al sistema de archivos ────────────────────────────────────────

  /**
   * Pide al usuario que elija una carpeta raíz.
   * Hay que llamar a esto una vez antes de cualquier operación.
   * Devuelve el nombre de la carpeta elegida, o null si se canceló.
   */
  async requestAccess(): Promise<string | null> {
    const ok = await webFilesystemProvider.requestRootAccess();
    if (!ok) return null;
    return webFilesystemProvider.getRootName();
  }

  isReady(): boolean {
    return webFilesystemProvider.isReady();
  }

  isSupported(): boolean {
    return webFilesystemProvider.isSupported();
  }

  // ── Lectura ──────────────────────────────────────────────────────────────

  async readFile(path: string): Promise<FileSystemResult> {
    try {
      return await webFilesystemProvider.readFile(path);
    } catch (error) {
      return { success: false, path, error: String(error) };
    }
  }

  async listDirectory(path: string): Promise<FileNode[]> {
    try {
      return await webFilesystemProvider.listDirectory(path);
    } catch (error) {
      console.error(`[FilesystemManager] listDirectory error (${path}):`, error);
      return [];
    }
  }

  async getDirectoryTree(path: string, maxDepth: number = 4): Promise<FileNode | null> {
    try {
      return await webFilesystemProvider.getDirectoryTree(path, maxDepth);
    } catch (error) {
      console.error(`[FilesystemManager] getDirectoryTree error (${path}):`, error);
      return null;
    }
  }

  // ── Escritura (con transacciones) ─────────────────────────────────────────

  async writeFile(path: string, content: string): Promise<FileSystemResult> {
    try {
      if (!this.isSupportedFormat(path)) {
        return { success: false, path, error: `Formato no soportado: .${this.getExtension(path)}` };
      }

      const transaction = await transactionManager.createTransaction("write", path);
      const simulation = await transactionManager.simulateTransaction(transaction.id);
      if (!simulation.success) {
        return { success: false, path, error: `Simulación fallida: ${simulation.errors.join(", ")}` };
      }

      const result = await webFilesystemProvider.writeFile(path, content);
      if (!result.success) {
        await transactionManager.rollbackTransaction(transaction.id);
        return result;
      }

      await transactionManager.executeTransaction(transaction.id);
      transactionManager.confirmTransaction(transaction.id);
      return result;
    } catch (error) {
      return { success: false, path, error: String(error) };
    }
  }

  async createFolder(path: string): Promise<FileSystemResult> {
    try {
      return await webFilesystemProvider.createFolder(path);
    } catch (error) {
      return { success: false, path, error: String(error) };
    }
  }

  async deleteFile(path: string): Promise<FileSystemResult> {
    try {
      const transaction = await transactionManager.createTransaction("delete", path);
      const simulation = await transactionManager.simulateTransaction(transaction.id);
      if (!simulation.success) {
        return { success: false, path, error: `Simulación fallida: ${simulation.errors.join(", ")}` };
      }

      const result = await webFilesystemProvider.deleteFile(path);
      if (!result.success) {
        await transactionManager.rollbackTransaction(transaction.id);
        return result;
      }

      await transactionManager.executeTransaction(transaction.id);
      transactionManager.confirmTransaction(transaction.id);
      return result;
    } catch (error) {
      return { success: false, path, error: String(error) };
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<FileSystemResult> {
    try {
      return await webFilesystemProvider.moveFile(sourcePath, targetPath);
    } catch (error) {
      return { success: false, path: targetPath, error: String(error) };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private isSupportedFormat(filePath: string): boolean {
    const ext = this.getExtension(filePath);
    const all: string[] = Object.values(SUPPORTED_FORMATS).flat();
    return all.includes(ext);
  }

  private getExtension(filePath: string): string {
    const parts = filePath.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  }
}

export const filesystemManager = new FilesystemManager();
