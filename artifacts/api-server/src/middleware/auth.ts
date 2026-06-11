import type { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";

/**
 * Authentication middleware.
 *
 * Validates the Bearer token from the Authorization header against
 * either the Supabase sessions table or the in-memory local session store.
 *
 * The local session store is shared with the auth routes via the exported
 * `localSessions` map (re-exported from ../routes/auth for single-source).
 */

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_API_KEY"];
  if (!url || !key || !url.startsWith("http")) return null;
  if (!_supabase) _supabase = createClient(url, key);
  return _supabase;
}

/**
 * In-memory session store shared with auth routes.
 * Imported by auth.ts route to keep the same reference.
 */
export const localSessions = new Map<
  string,
  { userId: string; expiresAt: number }
>();

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header required" });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: "Token required" });
    return;
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("user_id, expires_at")
        .eq("token", token)
        .single();

      const expiresAt = (session as Record<string, unknown> | null)?.[
        "expires_at"
      ];
      if (
        !error &&
        session &&
        typeof expiresAt === "string" &&
        new Date(expiresAt) >= new Date()
      ) {
        next();
        return;
      }
    } catch {
      // Fall through to local check
    }
  }

  const localSession = localSessions.get(token);
  if (localSession && localSession.expiresAt > Date.now()) {
    next();
    return;
  }

  res.status(401).json({ error: "Invalid or expired session" });
}
