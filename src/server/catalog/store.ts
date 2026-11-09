import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { productSchema, type Product, type StockReason } from "@/lib/catalog/types";

/**
 * Catálogo em memória (modo demonstração, sem Supabase). Começa com data/catalogo.json,
 * gerado por `npm run catalog:import -- planilha.csv`; sem o arquivo, a loja começa vazia.
 */
export type DemoMove = { id: string; variantId: string; delta: number; reason: StockReason; note: string; at: string; by: string };
export type CatalogStore = { products: Product[]; moves: DemoMove[] };

const g = globalThis as unknown as { __biCatalog?: CatalogStore };

function load(): Product[] {
  const file = join(/* turbopackIgnore: true */ process.cwd(), "data", "catalogo.json");
  if (!existsSync(file)) return [];
  try {
    return z.array(productSchema).parse(JSON.parse(readFileSync(file, "utf8")));
  } catch (e) {
    console.error("[loja] data/catalogo.json inválido:", e instanceof Error ? e.message : e);
    return [];
  }
}

export function catalogStore(): CatalogStore {
  if (g.__biCatalog) return g.__biCatalog;
  const products = load();
  const at = new Date().toISOString();
  const moves = products.flatMap((p) =>
    p.variants.filter((v) => v.stock > 0).map((v) => ({ id: crypto.randomUUID(), variantId: v.id, delta: v.stock, reason: "inicial" as const, note: "Saldo da planilha da loja antiga", at, by: "Importação" })),
  );
  return (g.__biCatalog = { products, moves });
}
