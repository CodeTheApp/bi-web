import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/** Cliente com a sessão do usuário do painel (respeita as políticas RLS). */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o proxy renova a sessão.
        }
      },
    },
  });
}

/** Cliente público, sem cookies: só lê o que está publicado. Pode ser usado dentro de cache. */
export function createSupabasePublic() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
}

/** Cliente de serviço (ignora RLS). Só para o formulário de contato e o webhook de e-mail. */
export function createSupabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false } });
}
