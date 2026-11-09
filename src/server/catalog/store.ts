import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { productSchema, type Product, type StockReason } from "@/lib/catalog/types";
import { readDemo, writeDemoSoon } from "../demo-file";

/**
 * Catálogo em memória (modo demonstração, sem Supabase). Começa com data/catalogo.json,
 * gerado por `npm run catalog:import -- planilha.csv`; as mudanças feitas no painel e as vendas ficam
 * em data/demo-catalogo-estado.json (apague o arquivo para voltar à planilha). Sem nada, a loja começa vazia.
 */
export type DemoMove = { id: string; variantId: string; delta: number; reason: StockReason; note: string; at: string; by: string };
export type CatalogStore = { products: Product[]; moves: DemoMove[] };

export const CATALOG_STATE = "demo-catalogo-estado.json";
const g = globalThis as unknown as { __biCatalog?: CatalogStore };

function fromSheet(): Product[] {
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
  const saved = readDemo<CatalogStore>(CATALOG_STATE);
  if (saved?.products?.length) {
    const products = z.array(productSchema).safeParse(saved.products);
    if (products.success) return (g.__biCatalog = { products: products.data, moves: saved.moves ?? [] });
  }
  const products = fromSheet();
  const at = new Date().toISOString();
  const moves = products.flatMap((p) =>
    p.variants.filter((v) => v.stock > 0).map((v) => ({ id: crypto.randomUUID(), variantId: v.id, delta: v.stock, reason: "inicial" as const, note: "Saldo da planilha da loja antiga", at, by: "Importação" })),
  );
  return (g.__biCatalog = { products, moves });
}

/** Chame depois de qualquer mudança no catálogo de demonstração. */
export const persistCatalog = () => writeDemoSoon(CATALOG_STATE, () => g.__biCatalog);
