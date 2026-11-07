"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente do navegador (usado para o tempo real da caixa de mensagens). */
export function getSupabaseBrowser() {
  if (!client) client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
