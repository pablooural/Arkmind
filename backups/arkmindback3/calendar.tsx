import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_API_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);

export function handleSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Error desconocido en Supabase";
}
