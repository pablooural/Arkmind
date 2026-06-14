/**
 * useAuth Hook
 * Gestiona estado de autenticación
 */

import { useState, useEffect, useCallback } from "react";
import { authManager, AuthSession, User } from "@/core/auth";

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar sesión al montar
  useEffect(() => {
    const session = authManager.loadSession();
    setUser(session?.user ?? null);
    setIsLoading(false);

    // Suscribirse a cambios de sesión
    const unsubscribe = authManager.onSessionChange((session) => {
      setUser(session?.user ?? null);
    });

    return unsubscribe;
  }, []);

  const handleLogout = useCallback(() => {
    authManager.clearSession();
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    logout: handleLogout,
  };
}
