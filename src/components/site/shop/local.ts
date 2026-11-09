"use client";
import { useSyncExternalStore } from "react";
import { z } from "zod";
import { cartItemSchema } from "@/lib/shop/types";

/**
 * Pequenas lojas de dados no localStorage, lidas com useSyncExternalStore:
 * no servidor (e na hidratação) valem o padrão; no navegador, o salvo. Outra aba mexeu? Atualiza sozinho.
 */
function localStore<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  let raw: string | null | undefined;
  let cache: T = fallback;
  const listeners = new Set<() => void>();
  const readRaw = () => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const get = () => {
    const r = readRaw();
    if (r !== raw) {
      raw = r;
      try {
        const p = r ? schema.safeParse(JSON.parse(r)) : null;
        cache = p?.success ? p.data : fallback;
      } catch {
        cache = fallback;
      }
    }
    return cache;
  };
  const set = (value: T) => {
    cache = value;
    raw = JSON.stringify(value);
    try {
      localStorage.setItem(key, raw);
    } catch {
      /* sem armazenamento: segue só na memória desta página */
    }
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    const onStorage = (e: StorageEvent) => e.key === key && l();
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };
  const server = () => fallback;
  return { get, set, subscribe, use: () => useSyncExternalStore(subscribe, get, server) };
}

const EMPTY_CART: z.infer<typeof cartItemSchema>[] = [];
const EMPTY_IDS: string[] = [];
export const cartStore = localStore("bi:sacola", z.array(cartItemSchema).max(60), EMPTY_CART);
export const favStore = localStore("bi:favoritos", z.array(z.string()).max(500), EMPTY_IDS);
export const cepStore = localStore("bi:cep", z.string().regex(/^\d{8}$/), "");

const noop = () => () => {};
/** true depois da hidratação (o que vem do navegador já pode aparecer). */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
