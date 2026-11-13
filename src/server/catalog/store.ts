import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  productSchema,
  type Product,
  type StockReason,
} from "@/entities/product";
import { readDemo, writeDemoSoon } from "../demo-file";
import { demoAllowed } from "@/server/admin/repo";
import {
  demoWorkspaceKey,
  getDemoDataMode,
  type DemoDataMode,
} from "@/server/demo-workspace";
import { seedDemoCatalog } from "./demo-fixtures";

/**
 * Catálogo em memória (modo demonstração, sem Supabase). Começa com data/catalogo.json,
 * gerado por `npm run catalog:import -- planilha.csv`. Cada modo usa uma cópia isolada;
 * os arquivos originais nunca recebem fixtures nem mudanças dos workspaces.
 */
export type DemoMove = {
  id: string;
  variantId: string;
  delta: number;
  reason: StockReason;
  note: string;
  at: string;
  by: string;
};
export type CatalogStore = {
  products: Product[];
  moves: DemoMove[];
  demoFixtures?: { version: number; createdAt: string };
};

export const CATALOG_STATE = "demo-catalogo-estado.json";
const g = globalThis as unknown as {
  __biCatalog?: CatalogStore;
  __biCatalogWorkspaces?: Map<string, CatalogStore>;
};
const workspaceFile = (mode: DemoDataMode) =>
  `demo-workspace-catalog-${mode}.json`;

function fromSheet(): Product[] {
  const file = join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "catalogo.json",
  );
  if (!existsSync(file)) return [];
  try {
    return z.array(productSchema).parse(JSON.parse(readFileSync(file, "utf8")));
  } catch (e) {
    console.error(
      "[loja] data/catalogo.json inválido:",
      e instanceof Error ? e.message : e,
    );
    return [];
  }
}

function originalCatalog(): CatalogStore {
  if (g.__biCatalog) return g.__biCatalog;
  const saved = readDemo<CatalogStore>(CATALOG_STATE);
  if (saved?.products?.length) {
    const products = z.array(productSchema).safeParse(saved.products);
    if (products.success)
      return (g.__biCatalog = {
        products: products.data,
        moves: saved.moves ?? [],
      });
  }
  const products = fromSheet();
  const at = new Date().toISOString();
  const moves = products.flatMap((p) =>
    p.variants
      .filter((v) => v.stock > 0)
      .map((v) => ({
        id: crypto.randomUUID(),
        variantId: v.id,
        delta: v.stock,
        reason: "inicial" as const,
        note: "Saldo da planilha da loja antiga",
        at,
        by: "Importação",
      })),
  );
  return (g.__biCatalog = { products, moves });
}

export function catalogStore(mode = getDemoDataMode()): CatalogStore {
  if (!demoAllowed()) return originalCatalog();
  const stores = (g.__biCatalogWorkspaces ??= new Map());
  const key = demoWorkspaceKey("catalog", mode);
  const existing = stores.get(key);
  if (existing) return existing;
  const saved = readDemo<CatalogStore>(workspaceFile(mode));
  const parsed = saved
    ? z.array(productSchema).safeParse(saved.products)
    : null;
  const state: CatalogStore = parsed?.success
    ? {
        products: parsed.data,
        moves: saved!.moves ?? [],
        demoFixtures: saved!.demoFixtures,
      }
    : mode === "examples"
      ? structuredClone(originalCatalog())
      : { products: [], moves: [] };
  stores.set(key, state);
  if (mode === "examples" && seedDemoCatalog(state))
    persistCatalog(mode, state);
  return state;
}

/** Capture both dataset and object before deferring a write across a mode switch. */
export function persistCatalog(
  mode = getDemoDataMode(),
  state = catalogStore(mode),
) {
  if (!demoAllowed()) return;
  writeDemoSoon(workspaceFile(mode), () => state);
}
