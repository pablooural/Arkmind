/**
 * Auth Manager — Estado local de sesión.
 *
 * ADR 0004: este manager es el **estado LOCAL** de la sesión de auth
 * (localStorage). El manager NO llama a ningún provider remoto.
 *
 * La integración con un auth provider real (Supabase, Auth0, custom) vive
 * en `artifacts/api-server/`, fuera del core. Si se enchufa, `api-server`
 * actúa como intermediario: valida credenciales, emite un token, y el
 * runtime del core recibe el `AuthSession` ya armado para guardarlo.
 *
 * Spec A3: los providers externos son opcionales. El runtime funciona
 * sin auth provider — `AuthManager.isAuthenticated()` devuelve `false` y
 * la app puede operar en modo single-user local.
 *
 * Spec A2: el estado del runtime vive en `localStorage` (no IndexedDB)
 * porque auth es de un solo plano — un solo usuario activo a la vez.
 * (Para multi-session / multi-user ver `snapshot-store` y ADR futuros.)
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

/**
 * Config del auth provider remoto. Se guarda en el manager solo a modo
 * informativo; la integración real con ese provider vive en `api-server`.
 *
 * ADR 0004: los nombres `remoteUrl` y `remoteKey` son neutros al provider.
 * Los aliases `supabaseUrl` y `supabaseKey` se mantienen como deprecated
 * para no romper callers que ya los usen.
 */
export interface AuthConfig {
  /** URL del endpoint del auth provider (en api-server, no en el core). */
  remoteUrl: string;
  /** Clave/secret del auth provider (en api-server, no en el core). */
  remoteKey: string;
  /**
   * @deprecated usar `remoteUrl`. Se mantiene por backwards-compat.
   */
  supabaseUrl?: string;
  /**
   * @deprecated usar `remoteKey`. Se mantiene por backwards-compat.
   */
  supabaseKey?: string;
}

export class AuthManager {
  private session: AuthSession | null = null;
  private remoteConfig: { url: string; key: string } | null = null;
  private listeners: Set<(session: AuthSession | null) => void> = new Set();

  /**
   * Cargar sesión desde localStorage.
   * Valida que el token no haya expirado. Si expiró, limpia.
   */
  loadSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem("auth_session");
      if (stored) {
        const session: AuthSession = JSON.parse(stored);
        if (session.expiresAt > Date.now()) {
          this.session = session;
          return session;
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.error("Error cargando sesión:", error);
    }
    return null;
  }

  /**
   * Guardar sesión en localStorage. El `AuthSession` se asume ya validado
   * por el auth provider (vía api-server). El core NO verifica el token.
   */
  saveSession(session: AuthSession): void {
    this.session = session;
    localStorage.setItem("auth_session", JSON.stringify(session));
    this.notifyListeners();
  }

  /**
   * Guardar referencia al auth provider remoto. Solo se guarda a modo
   * informativo — el core NO usa esta config para hacer llamadas. La
   * integración real vive en `api-server`.
   *
   * Acepta tanto la forma nueva (`remoteUrl` / `remoteKey`) como la legacy
   * (`supabaseUrl` / `supabaseKey`) por backwards-compat.
   */
  setRemoteConfig(config: AuthConfig): void {
    this.remoteConfig = {
      url: config.remoteUrl ?? config.supabaseUrl ?? "",
      key: config.remoteKey ?? config.supabaseKey ?? "",
    };
  }

  /**
   * Devuelve la config del provider remoto, o `null` si nunca se setó.
   * El core NO la usa para nada operativo; solo está disponible para
   * inspección y debugging.
   */
  getRemoteConfig(): { url: string; key: string } | null {
    return this.remoteConfig ? { ...this.remoteConfig } : null;
  }

  /**
   * Obtener sesión actual (en memoria).
   */
  getSession(): AuthSession | null {
    return this.session;
  }

  /**
   * Obtener usuario actual.
   */
  getUser(): User | null {
    return this.session?.user ?? null;
  }

  /**
   * Obtener token de autenticación.
   */
  getToken(): string | null {
    return this.session?.token ?? null;
  }

  /**
   * Verificar si hay sesión activa y no expirada.
   * En modo single-user local sin auth, devuelve `false`.
   */
  isAuthenticated(): boolean {
    if (!this.session) return false;
    return this.session.expiresAt > Date.now();
  }

  /**
   * Limpiar sesión (logout).
   */
  clearSession(): void {
    this.session = null;
    localStorage.removeItem("auth_session");
    this.notifyListeners();
  }

  /**
   * Suscribirse a cambios de sesión. Devuelve función de unsubscribe.
   */
  onSessionChange(callback: (session: AuthSession | null) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notificar a listeners sobre cambios.
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback(this.session ?? null));
  }
}

// Instancia global
export const authManager = new AuthManager();
