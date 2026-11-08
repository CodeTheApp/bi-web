export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sem as variáveis do Supabase o site roda com o conteúdo inicial (src/lib/content/seed.ts). */
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
