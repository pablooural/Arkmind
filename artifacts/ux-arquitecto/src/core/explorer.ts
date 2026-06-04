import { opJournal } from "./opJournal";
import { filesystemManager } from "./filesystem";
import { memoryManager } from "./memory";

export class CognitiveExplorer {
  /**
   * Explora un directorio y lo registra en el journal y la memoria.
   * Esto permite que la IA "sepa" qué archivos existen.
   */
  async explore(sessionId: string, path: string): Promise<string[]> {
    try {
      // 1. Obtener archivos reales del FS
      const files = await filesystemManager.listDirectory(path);
      
      // 2. Registrar la exploración en el journal
      await opJournal.log({
        type: "explore",
        path: path,
        metadata: {
          summary: `Exploración de directorio: ${path}`,
          fileCount: files.length,
          files: files.slice(0, 10), // Guardamos una muestra
        }
      });

      // 3. Actualizar la memoria de trabajo con los recursos activos
      const wm = memoryManager.getWorkingMemory(sessionId);
      const activeResources = new Set([...wm.activeResources, path]);
      
      // Añadimos los primeros 5 archivos como recursos relevantes detectados
      files.slice(0, 5).forEach(f => activeResources.add(`${path}/${f}`));
      
      memoryManager.updateWorkingMemory(sessionId, {
        activeResources: Array.from(activeResources).slice(-20) // Limitamos para no saturar
      });

      return files;
    } catch (error) {
      console.error(`[CognitiveExplorer] Error explorando ${path}:`, error);
      return [];
    }
  }

  /**
   * "Mira" un archivo (lectura con registro de conciencia).
   */
  async lookAt(sessionId: string, path: string): Promise<string | null> {
    try {
      const content = await filesystemManager.readFile(path);
      
      // Registrar que la IA ha "visto" este archivo
      await opJournal.log({
        type: "read",
        path: path,
        metadata: {
          summary: `Lectura consciente de archivo: ${path}`,
          size: content.length
        }
      });

      // Actualizar foco en la memoria
      memoryManager.updateWorkingMemory(sessionId, {
        focus: `Analizando ${path}`,
        activeResources: [...new Set([...memoryManager.getWorkingMemory(sessionId).activeResources, path])].slice(-20)
      });

      return content;
    } catch (error) {
      console.error(`[CognitiveExplorer] Error leyendo ${path}:`, error);
      return null;
    }
  }
}

export const cognitiveExplorer = new CognitiveExplorer();
