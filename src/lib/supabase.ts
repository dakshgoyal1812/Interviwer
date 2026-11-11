// ============================================================================
// INTERVIEWX AI — FRONTEND SUPABASE CLIENT
// Only the PUBLIC Supabase URL + publishable (anon) key live in the frontend —
// these are designed to be public and are protected by Row-Level Security.
// Every privileged key (LLM, TTS, sandbox) stays on the Render backend .env.
// When Supabase is not configured the app transparently falls back to
// Local/Guest mode so nothing ever hard-fails.
// ============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('your-project-id')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
