import { createClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "./supabase-config";
const url = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL),
  key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const supabase = url && key ? createClient(url, key) : null;

export const supabaseProjectHost = supabase ? new URL(url!).hostname : "";
