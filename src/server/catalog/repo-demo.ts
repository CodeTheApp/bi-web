import "server-only";
import { slugify } from "@/lib/catalog/import";
import { summarize, variantLabel, type Product, type StockMove } from "@/lib/catalog/types";
import { newId, shortId, type CatalogRepo } from "./repo";
import { catalogStore, persistCatalog } from "./store";

const clone = <T,>(x: T): T => structuredClone(x);

export function demoCatalog(): CatalogRepo {
  const repo = build();
  // toda mudança é gravada em data/ para sobreviver a reinícios do servidor local
  for (const k of ["create", "save", "remove", "setStatus", "setPolicy", "move", "sell", "importProducts", "appendMedia"] as const) {
    const fn = repo[k] as (...a: unknown[]) => Promise<unknown>;
    (repo as unknown as Record<string, unknown>)[k] = async (...a: unknown[]) => {
      const r = await fn.apply(repo, a);
      persistCatalog();
      return r;
    };
  }
  return repo;
}

function build(): CatalogRepo {
  const S = catalogStore();
  const variantIndex = () => {
    const m = new Map<string, { p: Product; v: Product["variants"][number] }>();
    for (const p of S.products) for (const v of p.variants) m.set(v.id, { p, v });
    return m;
  };
  return {
    mode: "demo",
    list: async () => S.products.map(summarize),
    get: async (id) => clone(S.products.find((p) => p.id === id) ?? null),
    async create() {
      const id = newId();
      const code = shortId();
      S.products.unshift({
        id, slug: `novo-produto-${code.toLowerCase()}`, title: "Novo produto", category: "pendentes", status: "rascunho", description: "", specs: {}, options: [],
        variants: [{ id: newId(), sku: `NOVO-${code}`, options: {}, priceCents: null, compareAtCents: null, stockPolicy: "encomenda", leadTimeDays: null, stock: 0, active: true, legacyName: "" }],
        media: [], legacy: { names: [], key: "" },
      });
      return id;
    },
    async save(p) {
      const i = S.products.findIndex((x) => x.id === p.id);
      if (i < 0) throw new Error("Produto não encontrado.");
      const stockById = new Map(S.products[i].variants.map((v) => [v.id, v.stock]));
      // o saldo só muda pelos movimentos de estoque
      S.products[i] = { ...clone(p), variants: p.variants.map((v) => ({ ...clone(v), stock: stockById.get(v.id) ?? 0 })) };
    },
    async remove(id) {
      const p = S.products.find((x) => x.id === id);
      const ids = new Set(p?.variants.map((v) => v.id));
      S.products = S.products.filter((x) => x.id !== id);
      S.moves = S.moves.filter((m) => !ids.has(m.variantId));
    },
    async setStatus(ids, status) {
      for (const p of S.products) if (ids.includes(p.id)) p.status = status;
    },
    async setPolicy(ids, policy) {
      for (const p of S.products) if (ids.includes(p.id)) for (const v of p.variants) v.stockPolicy = policy;
    },
    slugTaken: async (slug, exceptId) => S.products.some((p) => p.slug === slug && p.id !== exceptId),
    async skuOwner(skus, exceptProductId) {
      const want = new Set(skus.map((s) => s.toUpperCase()));
      for (const p of S.products) if (p.id !== exceptProductId) for (const v of p.variants) if (want.has(v.sku.toUpperCase())) return `${v.sku} (${p.title})`;
      return null;
    },

    async stock() {
      return S.products
        .flatMap((p) =>
          p.variants.map((v) => ({
            variantId: v.id, productId: p.id, product: p.title, status: p.status, sku: v.sku, label: variantLabel(v, p.options),
            stockPolicy: v.stockPolicy, leadTimeDays: v.leadTimeDays, stock: v.stock, active: v.active,
          })),
        )
        .sort((a, b) => a.product.localeCompare(b.product, "pt-BR") || a.sku.localeCompare(b.sku));
    },
    async moves(variantId) {
      const idx = variantIndex();
      return S.moves
        .filter((m) => !variantId || m.variantId === variantId)
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 300)
        .flatMap((m): StockMove[] => {
          const hit = idx.get(m.variantId);
          return hit ? [{ ...m, productId: hit.p.id, product: hit.p.title, sku: hit.v.sku, label: variantLabel(hit.v, hit.p.options) }] : [];
        });
    },
    async sell(items, sign, note) {
      const idx = variantIndex();
      const out: Array<{ variantId: string; moved: number }> = [];
      for (const it of items) {
        const hit = idx.get(it.variantId);
        if (!hit) continue;
        const moved = sign === 1 ? (it.moved ?? it.qty) : hit.v.stockPolicy === "estoque" ? it.qty : Math.min(it.qty, Math.max(0, hit.v.stock));
        if (!moved) continue;
        hit.v.stock += sign * moved;
        S.moves.push({ id: newId(), variantId: it.variantId, delta: sign * moved, reason: sign === 1 ? "devolucao" : "venda", note, at: new Date().toISOString(), by: "Loja" });
        out.push({ variantId: it.variantId, moved });
      }
      return out;
    },
    async move(variantId, delta, reason, note, by) {
      const hit = variantIndex().get(variantId);
      if (!hit) throw new Error("Variante não encontrada.");
      hit.v.stock += delta;
      S.moves.push({ id: newId(), variantId, delta, reason, note, at: new Date().toISOString(), by });
    },

    async importProducts(products) {
      const bySku = new Map<string, { p: Product; v: Product["variants"][number] }>();
      for (const p of S.products) for (const v of p.variants) bySku.set(v.sku.toUpperCase(), { p, v });
      const slugs = new Set(S.products.map((p) => p.slug));
      let created = 0, addedVariants = 0, updatedPrices = 0;
      for (const np of products) {
        const owner = np.variants.map((v) => bySku.get(v.sku.toUpperCase())?.p).find(Boolean);
        if (!owner) {
          let slug = np.slug;
          for (let i = 2; slugs.has(slug); i++) slug = `${slugify(np.title)}-${i}`;
          slugs.add(slug);
          const p = clone({ ...np, slug, variants: np.variants.map((v) => ({ ...v, stock: 0 })) });
          S.products.push(p);
          created++;
          for (const v of np.variants) if (v.stock > 0) await this.move(v.id, v.stock, "inicial", "Saldo da planilha", "Importação");
          continue;
        }
        for (const v of np.variants) {
          const hit = bySku.get(v.sku.toUpperCase());
          if (hit) {
            if (v.priceCents !== hit.v.priceCents) {
              hit.v.priceCents = v.priceCents;
              updatedPrices++;
            }
          } else {
            owner.variants.push({ ...clone(v), stock: 0 });
            addedVariants++;
          }
        }
      }
      return { created, addedVariants, updatedPrices };
    },

    matchTargets: async () =>
      S.products.map((p) => ({ id: p.id, title: p.title, key: p.legacy.key, names: p.legacy.names, skus: p.variants.map((v) => v.sku), urls: p.media.map((m) => m.url) })),
    async appendMedia(links) {
      for (const l of links) {
        const p = S.products.find((x) => x.id === l.productId);
        if (p) p.media.push({ url: l.url, kind: l.kind, alt: p.title, variantId: null, visible: l.visible });
      }
    },
  };
}
