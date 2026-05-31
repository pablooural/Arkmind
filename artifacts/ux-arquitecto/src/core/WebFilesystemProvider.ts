/**
 * WebFilesystemProvider
 * Implementación real usando la File System Access API del browser.
 *
 * Uso:
 *   1. Llamar a requestRootAccess() — abre el picker del browser
 *   2. A partir de ahí, todas las operaciones usan el handle real
 *
 * Compatibilidad: Chrome/Edge 86+, Opera 72+
 * No disponible en: Firefox, Safari (parcial), WebViews básicos
 */

import { FileNode } from "@/core/types";

// ─── Tipos internos ────────────────────────────────────────────────────────────

export interface ProviderResult {
  success: boolean;
  path: string;
  content?: string;
  size?: number;
  error?: string;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class WebFilesystemProvider {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private rootName: string = "";

  // ── Acceso ────────────────────────────────────────────────────────────────

  /**
   * Solicita al usuario que elija una carpeta raíz.
   * Llama una sola vez por sesión (o cuando el usuario quiere cambiar de raíz).
   */
  async requestRootAccess(): Promise<boolean> {
    if (!this.isSupported()) {
      console.error("[WebFilesystemProvider] File System Access API no disponible.");
      return false;
    }
    try {
      this.rootHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      this.rootName = this.rootHandle!.name;
      return true;
    } catch (err) {
      // El usuario canceló o se denegó el permiso
      return false;
    }
  }

  /** ¿Está la API disponible en este browser? */
  isSupported(): boolean {
    return typeof (window as any).showDirectoryPicker === "function";
  }

  /** ¿Hay una raíz seleccionada? */
  isReady(): boolean {
    return this.rootHandle !== null;
  }

  /** Nombre de la carpeta raíz seleccionada */
  getRootName(): string {
    return this.rootName;
  }

  // ── Navegación ────────────────────────────────────────────────────────────

  /**
   * Devuelve el árbol de archivos a partir de la raíz (o de una subcarpeta).
   * maxDepth evita explotar en proyectos enormes.
   */
  async getDirectoryTree(relativePath: string = "/", maxDepth: number = 4): Promise<FileNode | null> {
    if (!this.rootHandle) return null;
    try {
      const dirHandle = await this.resolveDirectory(relativePath);
      if (!dirHandle) return null;
      return await this.buildTree(dirHandle, relativePath, 0, maxDepth);
    } catch (err) {
      console.error("[WebFilesystemProvider] getDirectoryTree error:", err);
      return null;
    }
  }

  /**
   * Lista los hijos directos de una carpeta (sin recursión).
   */
  async listDirectory(relativePath: string = "/"): Promise<FileNode[]> {
    if (!this.rootHandle) return [];
    try {
      const dirHandle = await this.resolveDirectory(relativePath);
      if (!dirHandle) return [];
      const nodes: FileNode[] = [];
      for await (const [name, handle] of (dirHandle as any).entries()) {
        const isFolder = handle.kind === "directory";
        const nodePath = this.joinPath(relativePath, name);
        if (isFolder) {
          nodes.push({
            id: nodePath,
            path: nodePath,
            name,
            type: "folder",
            children: [],
          });
        } else {
          const file = await (handle as FileSystemFileHandle).getFile();
          nodes.push({
            id: nodePath,
            path: nodePath,
            name,
            type: "file",
            size: file.size,
            modifiedAt: file.lastModified,
            ext: this.getExtension(name),
          });
        }
      }
      return this.sortNodes(nodes);
    } catch (err) {
      console.error("[WebFilesystemProvider] listDirectory error:", err);
      return [];
    }
  }

  // ── Lectura / Escritura ───────────────────────────────────────────────────

  async readFile(relativePath: string): Promise<ProviderResult> {
    if (!this.rootHandle) return this.notReady(relativePath);
    try {
      const fileHandle = await this.resolveFile(relativePath);
      if (!fileHandle) return { success: false, path: relativePath, error: "Archivo no encontrado" };
      const file = await fileHandle.getFile();
      const content = await file.text();
      return { success: true, path: relativePath, content, size: file.size };
    } catch (err) {
      return { success: false, path: relativePath, error: String(err) };
    }
  }

  async writeFile(relativePath: string, content: string): Promise<ProviderResult> {
    if (!this.rootHandle) return this.notReady(relativePath);
    try {
      const fileHandle = await this.resolveOrCreateFile(relativePath);
      if (!fileHandle) return { success: false, path: relativePath, error: "No se pudo crear el archivo" };
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return { success: true, path: relativePath, size: content.length };
    } catch (err) {
      return { success: false, path: relativePath, error: String(err) };
    }
  }

  async createFolder(relativePath: string): Promise<ProviderResult> {
    if (!this.rootHandle) return this.notReady(relativePath);
    try {
      await this.resolveOrCreateDirectory(relativePath);
      return { success: true, path: relativePath };
    } catch (err) {
      return { success: false, path: relativePath, error: String(err) };
    }
  }

  async deleteFile(relativePath: string): Promise<ProviderResult> {
    if (!this.rootHandle) return this.notReady(relativePath);
    try {
      const parts = this.splitPath(relativePath);
      const name = parts.pop()!;
      const parentPath = parts.join("/") || "/";
      const parentHandle = await this.resolveDirectory(parentPath);
      if (!parentHandle) return { success: false, path: relativePath, error: "Carpeta padre no encontrada" };
      await (parentHandle as any).removeEntry(name, { recursive: true });
      return { success: true, path: relativePath };
    } catch (err) {
      return { success: false, path: relativePath, error: String(err) };
    }
  }

  async moveFile(sourcePath: string, targetPath: string): Promise<ProviderResult> {
    // La API no soporta move nativo todavía → copiar + borrar
    const read = await this.readFile(sourcePath);
    if (!read.success || read.content === undefined) {
      return { success: false, path: targetPath, error: read.error ?? "No se pudo leer el origen" };
    }
    const write = await this.writeFile(targetPath, read.content);
    if (!write.success) return write;
    await this.deleteFile(sourcePath);
    return { success: true, path: targetPath };
  }

  // ── Helpers privados ──────────────────────────────────────────────────────

  private async buildTree(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    depth: number,
    maxDepth: number
  ): Promise<FileNode> {
    const node: FileNode = {
      id: currentPath,
      path: currentPath,
      name: dirHandle.name,
      type: "folder",
      children: [],
    };

    if (depth >= maxDepth) return node;

    for await (const [name, handle] of (dirHandle as any).entries()) {
      const childPath = this.joinPath(currentPath, name);
      if (handle.kind === "directory") {
        const child = await this.buildTree(handle as FileSystemDirectoryHandle, childPath, depth + 1, maxDepth);
        node.children!.push(child);
      } else {
        const file = await (handle as FileSystemFileHandle).getFile();
        node.children!.push({
          id: childPath,
          path: childPath,
          name,
          type: "file",
          size: file.size,
          modifiedAt: file.lastModified,
          ext: this.getExtension(name),
        });
      }
    }

    node.children = this.sortNodes(node.children!);
    return node;
  }

  private async resolveDirectory(relativePath: string): Promise<FileSystemDirectoryHandle | null> {
    if (!this.rootHandle) return null;
    const parts = this.splitPath(relativePath);
    let current: FileSystemDirectoryHandle = this.rootHandle;
    for (const part of parts) {
      try {
        current = await current.getDirectoryHandle(part);
      } catch {
        return null;
      }
    }
    return current;
  }

  private async resolveOrCreateDirectory(relativePath: string): Promise<FileSystemDirectoryHandle | null> {
    if (!this.rootHandle) return null;
    const parts = this.splitPath(relativePath);
    let current: FileSystemDirectoryHandle = this.rootHandle;
    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }
    return current;
  }

  private async resolveFile(relativePath: string): Promise<FileSystemFileHandle | null> {
    if (!this.rootHandle) return null;
    const parts = this.splitPath(relativePath);
    const name = parts.pop()!;
    const dirHandle = parts.length > 0 ? await this.resolveDirectory(parts.join("/")) : this.rootHandle;
    if (!dirHandle) return null;
    try {
      return await dirHandle.getFileHandle(name);
    } catch {
      return null;
    }
  }

  private async resolveOrCreateFile(relativePath: string): Promise<FileSystemFileHandle | null> {
    if (!this.rootHandle) return null;
    const parts = this.splitPath(relativePath);
    const name = parts.pop()!;
    let dirHandle: FileSystemDirectoryHandle;
    if (parts.length > 0) {
      const resolved = await this.resolveOrCreateDirectory(parts.join("/"));
      if (!resolved) return null;
      dirHandle = resolved;
    } else {
      dirHandle = this.rootHandle;
    }
    return await dirHandle.getFileHandle(name, { create: true });
  }

  private splitPath(path: string): string[] {
    return path.replace(/^\//, "").split("/").filter(Boolean);
  }

  private joinPath(base: string, name: string): string {
    const clean = base.replace(/\/$/, "");
    return clean === "" || clean === "/" ? `/${name}` : `${clean}/${name}`;
  }

  private getExtension(name: string): string {
    const parts = name.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
  }

  private sortNodes(nodes: FileNode[]): FileNode[] {
    return nodes.sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name);
    });
  }

  private notReady(path: string): ProviderResult {
    return { success: false, path, error: "Sin acceso al sistema de archivos. Llamar a requestRootAccess() primero." };
  }
}

export const webFilesystemProvider = new WebFilesystemProvider();
