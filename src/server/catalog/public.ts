import "server-only";
import { unstable_cache } from "next/cache";
import { canSell, toPublic, type CategorySlug, type PublicProduct } from "@/lib/catalog/types";
import { hasSupabase } from "@/lib/supabase/env";
import { createSupabasePublic } from "@/lib/supabase/server";
import { all, groupBy } from "./rows";
import { catalogStore } from "./store";

/** Publicar no painel chama updateTag(CATALOG_TAG) e a vitrine atualiza. */
export const CATALOG_TAG = "catalog";

async function load(): Promise<PublicProduct[]> {
  // produto sem nada para vender (sem saldo e sem encomenda) fica fora da loja até entrar estoque
  if (!hasSupabase) return catalogStore().products.filter((p) => p.status === "publicado").map(toPublic).filter((p) => p.variants.some(canSell));
  const db = createSupabasePublic();
  const [ps, vs, ms] = await Promise.all([
    all((f, t) => db.from("products").select("id, slug, title, category, description, specs, options, position").eq("status", "publicado").order("position").order("title").range(f, t)),
    all((f, t) => db.from("product_variants").select("id, product_id, sku, options, price_cents, compare_at_cents, stock_policy, lead_time_days, in_stock, position").order("position").range(f, t)),
    all((f, t) => db.from("product_media").select("product_id, variant_id, kind, url, alt, visible, position").order("position").range(f, t)),
  ]);
  const vBy = groupBy(vs, (v) => v.product_id);
  const mBy = groupBy(ms, (m) => m.product_id);
  return ps
    .map((p) => ({
      id: p.id, slug: p.slug, title: p.title, category: p.category as CategorySlug, description: p.description,
      specs: (p.specs ?? {}) as Record<string, string>, options: p.options,
      variants: (vBy.get(p.id) ?? []).map((v) => ({
        id: v.id, sku: v.sku, options: (v.options ?? {}) as Record<string, string>, priceCents: v.price_cents, compareAtCents: v.compare_at_cents,
        stockPolicy: v.stock_policy, leadTimeDays: v.lead_time_days, inStock: v.in_stock,
      })),
      media: (mBy.get(p.id) ?? []).filter((m) => m.visible).map((m) => ({ url: m.url, kind: m.kind, alt: m.alt, variantId: m.variant_id, visible: true })),
    }))
    .filter((p) => p.variants.some(canSell));
}

async function safeLoad() {
  try {
    return await load();
  } catch (e) {
    console.error("[loja] falha ao ler o catálogo", e);
    return [];
  }
}

/**
 * Produtos publicados, em cache até alguém publicar no painel ou movimentar o estoque.
 * No modo demonstração o catálogo vive na memória do servidor: lê direto, sem cache em disco
 * (senão um reinício mostraria a versão antiga).
 */
export const getCatalog = hasSupabase ? unstable_cache(safeLoad, ["catalog"], { tags: [CATALOG_TAG], revalidate: 3600 }) : safeLoad;

export async function getProductPage(slug: string) {
  const products = await getCatalog();
  const product = products.find((p) => p.slug === slug);
  if (!product) return null;
  const same = products.filter((p) => p.category === product.category && p.id !== product.id);
  // relacionados: mesma categoria, primeiro os que têm foto
  const related = [...same.filter((p) => p.media.length), ...same.filter((p) => !p.media.length)].slice(0, 4);
  return { product, related };
}
