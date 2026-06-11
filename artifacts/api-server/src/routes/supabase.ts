import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

/**
 * Lazily creates a Supabase client only when both URL and API key are set.
 * Returns `null` when the env vars are missing, so callers can fall back
 * to local-only behaviour.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_API_KEY"];
  if (!url || !key || !url.startsWith("http")) return null;
  if (!_supabase) _supabase = createClient(url, key);
  return _supabase;
}

export function handleSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido en Supabase";
}
