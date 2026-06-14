/**
 * useFilesystem Hook
 * Operaciones de filesystem con transacciones automáticas
 * 
 * CAMBIOS CAPA 1:
 * - FileSystemResult ahora se importa desde @/core/filesystem
 */

import { useState, useCallback } from "react";
import { filesystemManager, FileSystemResult } from "@/core/filesystem";

interface UseFilesystemReturn {
  readFile: (path: string) => Promise<FileSystemResult>;
  writeFile: (path: string, content: string) => Promise<FileSystemResult>;
  deleteFile: (path: string) => Promise<FileSystemResult>;
  createFolder: (path: string) => Promise<FileSystemResult>;
  moveFile: (source: string, target: string) => Promise<FileSystemResult>;
  isLoading: boolean;
  error: string | null;
}

export function useFilesystem(): UseFilesystemReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReadFile = useCallback(async (path: string): Promise<FileSystemResult> => {
    setIsLoading(true);
    setError(null);
    try {
      return await filesystemManager.readFile(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return {
        success: false,
        path,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleWriteFile = useCallback(
    async (path: string, content: string): Promise<FileSystemResult> => {
      setIsLoading(true);
      setError(null);
      try {
        return await filesystemManager.writeFile(path, content);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return {
          success: false,
          path,
          error: message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleDeleteFile = useCallback(async (path: string): Promise<FileSystemResult> => {
    setIsLoading(true);
    setError(null);
    try {
      return await filesystemManager.deleteFile(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return {
        success: false,
        path,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCreateFolder = useCallback(async (path: string): Promise<FileSystemResult> => {
    setIsLoading(true);
    setError(null);
    try {
      return await filesystemManager.createFolder(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return {
        success: false,
        path,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleMoveFile = useCallback(
    async (source: string, target: string): Promise<FileSystemResult> => {
      setIsLoading(true);
      setError(null);
      try {
        return await filesystemManager.moveFile(source, target);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        return {
          success: false,
          path: target,
          error: message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    readFile: handleReadFile,
    writeFile: handleWriteFile,
    deleteFile: handleDeleteFile,
    createFolder: handleCreateFolder,
    moveFile: handleMoveFile,
    isLoading,
    error,
  };
}
