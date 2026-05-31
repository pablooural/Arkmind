/**
 * Snapshot Manager
 * Gestión de snapshots automáticos y rollback
 * 
 * CAMBIOS CAPA 1:
 * - SnapshotMetadata eliminado de types.ts
 * - Ahora usamos Snapshot directamente como tipo único
 * - El mapa interno es Map<string, Snapshot> en lugar de Map<string, SnapshotMetadata>
 * - API pública sin cambios
 */

import { Snapshot, FileNode } from "./types";

export class SnapshotManager {
  private snapshots: Map<string, Snapshot> = new Map();
  private storePath = ".snapshots";

  /**
   * Crear snapshot automático antes de operación destructiva
   */
  async createSnapshot(
    contextPath: string,
    files: FileNode[],
    reason: "write" | "delete" | "refactor" | "auto",
    label?: string
  ): Promise<Snapshot> {
    const id = this.generateSnapshotId();
    const timestamp = Date.now();

    const snapshot: Snapshot = {
      id,
      timestamp,
      label: label || `Auto-snapshot ${new Date(timestamp).toISOString()}`,
      description: `${reason} operation snapshot`,
      contextPath,
      metadata: {
        resourceCount: this.countFiles(files),
        changedResources: this.extractFilePaths(files),
        totalSize: this.calculateSize(files),
      },
      storePath: `${this.storePath}/${id}`,
    };

    this.snapshots.set(id, snapshot);

    // TODO: Persistir snapshot en filesystem
    // await this.persistSnapshot(id, snapshot, files);

    return snapshot;
  }

  /**
   * Obtener snapshot por ID
   */
  getSnapshot(snapshotId: string): Snapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Listar snapshots por contexto
   */
  listSnapshots(contextPath: string): Snapshot[] {
    const result: Snapshot[] = [];
    this.snapshots.forEach((snapshot) => {
      if (snapshot.contextPath === contextPath) {
        result.push(snapshot);
      }
    });
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Rollback a snapshot específico
   */
  async rollback(snapshotId: string): Promise<boolean> {
    const snapshot = this.getSnapshot(snapshotId);
    if (!snapshot) {
      console.error(`Snapshot ${snapshotId} not found`);
      return false;
    }

    // TODO: Implementar lógica de restauración
    // 1. Validar integridad del snapshot
    // 2. Restaurar archivos
    // 3. Verificar resultado
    // 4. Registrar operación

    console.log(`Rollback to snapshot ${snapshotId} - TODO: implement`);
    return true;
  }

  /**
   * Eliminar snapshot antiguo
   */
  deleteSnapshot(snapshotId: string): boolean {
    return this.snapshots.delete(snapshotId);
  }

  /**
   * Limpiar snapshots antiguos (> 30 días)
   */
  async cleanOldSnapshots(daysOld: number = 30): Promise<number> {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    let deleted = 0;

    const idsToDelete: string[] = [];
    this.snapshots.forEach((snapshot, id) => {
      if (snapshot.timestamp < cutoffTime) {
        idsToDelete.push(id);
      }
    });

    idsToDelete.forEach((id) => {
      this.snapshots.delete(id);
      deleted++;
      // TODO: Eliminar archivos del almacenamiento
    });

    return deleted;
  }

  // ============ HELPERS ============

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private countFiles(files: FileNode[]): number {
    let count = 0;
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (node.type === "file") count++;
        if (node.children) traverse(node.children);
      });
    };
    traverse(files);
    return count;
  }

  private calculateSize(files: FileNode[]): number {
    let size = 0;
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (node.size) size += node.size;
        if (node.children) traverse(node.children);
      });
    };
    traverse(files);
    return size;
  }

  private extractFilePaths(files: FileNode[]): string[] {
    const paths: string[] = [];
    const traverse = (nodes: FileNode[]) => {
      nodes.forEach((node) => {
        if (node.type === "file") paths.push(node.path);
        if (node.children) traverse(node.children);
      });
    };
    traverse(files);
    return paths;
  }
}

export const snapshotManager = new SnapshotManager();
