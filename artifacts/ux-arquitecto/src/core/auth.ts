/**
 * Authentication Manager
 * Gestiona autenticación por email con confirmación
 * 
 * Flujo:
 * 1. Usuario ingresa email
 * 2. Se envía email de confirmación
 * 3. Usuario hace clic en enlace del email
 * 4. Se confirma y queda logueado
 * 5. Las credenciales se guardan en localStorage
 */

export interface User {
  id: string;
  email: string;
  name: string;
  confirmedAt: number;
  createdAt: number;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

export interface AuthConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export class AuthManager {
  private session: AuthSession | null = null;
  private listeners: Set<(session: AuthSession | null) => void> = new Set();

  /**
   * Cargar sesión desde localStorage
   */
  loadSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem("auth_session");
      if (stored) {
        const session: AuthSession = JSON.parse(stored);
        // Validar que no haya expirado
        if (session.expiresAt > Date.now()) {
          this.session = session;
          return session;
        } else {
          // Token expirado, limpiar
          this.clearSession();
        }
      }
    } catch (error) {
      console.error("Error cargando sesión:", error);
    }
    return null;
  }

  /**
   * Guardar sesión en localStorage
   */
  saveSession(session: AuthSession): void {
    this.session = session;
    localStorage.setItem("auth_session", JSON.stringify(session));
    this.notifyListeners();
  }

  /**
   * Obtener sesión actual
   */
  getSession(): AuthSession | null {
    return this.session;
  }

  /**
   * Obtener usuario actual
   */
  getUser(): User | null {
    return this.session?.user ?? null;
  }

  /**
   * Obtener token de autenticación
   */
  getToken(): string | null {
    return this.session?.token ?? null;
  }

  /**
   * Verificar si usuario está autenticado
   */
  isAuthenticated(): boolean {
    if (!this.session) return false;
    return this.session.expiresAt > Date.now();
  }

  /**
   * Limpiar sesión (logout)
   */
  clearSession(): void {
    this.session = null;
    localStorage.removeItem("auth_session");
    this.notifyListeners();
  }

  /**
   * Suscribirse a cambios de sesión
   */
  onSessionChange(callback: (session: AuthSession | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notificar a listeners sobre cambios
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.session ?? null));
  }
}

// Instancia global
export const authManager = new AuthManager();
