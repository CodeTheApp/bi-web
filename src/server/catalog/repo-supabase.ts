import "server-only";
import { slugify } from "@/entities/product";
import { summarize, variantLabel, type CategorySlug, type Product, type StockMove, type Variant } from "@/entities/product";
import type { Json, Tables } from "@/shared/api/supabase/database.types";
import { createSupabaseServer, createSupabaseService } from "@/shared/api/supabase/server";
import { newId, shortId, type CatalogRepo } from "./repo";
import { all, chunks, groupBy, must } from "./rows";

type VariantRow = Tables<"product_variants">;

const toVariant = (r: VariantRow): Variant => ({
  id: r.id, sku: r.sku, options: (r.options ?? {}) as Record<string, string>, priceCents: r.price_cents, compareAtCents: r.compare_at_cents,
  stockPolicy: r.stock_policy, leadTimeDays: r.lead_time_days, stock: r.stock_on_hand, active: r.active, legacyName: r.legacy_name,
});

const variantRow = (productId: string, v: Variant, position: number) => ({
  id: v.id, product_id: productId, sku: v.sku, options: v.options as Json, price_cents: v.priceCents, compare_at_cents: v.compareAtCents,
  stock_policy: v.stockPolicy, lead_time_days: v.leadTimeDays, active: v.active, legacy_name: v.legacyName, position,
});

const productRow = (p: Product, position?: number) => ({
  id: p.id, slug: p.slug, title: p.title, category: p.category, status: p.status, description: p.description, specs: p.specs as Json, options: p.options,
  legacy: p.legacy as Json, ...(position != null ? { position } : null),
});

/** Erros de unicidade do Postgres viram mensagens que a equipe entende. */
function friendly(e: { message: string; code?: string } | null, what: string) {
  if (!e) return;
  if (e.code === "23505") throw new Error(`${what} já está em uso.`);
  throw new Error(e.message);
}

export async function supabaseCatalog(): Promise<CatalogRepo> {
  const db = await createSupabaseServer();

  const titles = async (ids: string[]) => {
    const rows = ids.length ? must(await db.from("products").select("id, title, options").in("id", [...new Set(ids)])) : [];
    return new Map(rows.map((r) => [r.id, r]));
  };

  return {
    mode: "supabase",

    async list() {
      const [ps, vs, ms] = await Promise.all([
        all((f, t) => db.from("products").select("id, slug, title, category, status").order("position").order("title").range(f, t)),
        all((f, t) => db.from("product_variants").select("product_id, sku, options, price_cents, stock_on_hand, stock_policy, active").order("position").range(f, t)),
        all((f, t) => db.from("product_media").select("product_id, url, kind, visible, position").order("position").range(f, t)),
      ]);
      const vBy = groupBy(vs, (v) => v.product_id);
      const mBy = groupBy(ms, (m) => m.product_id);
      return ps.map((p) =>
        summarize({
          ...p,
          category: p.category as CategorySlug,
          media: mBy.get(p.id) ?? [],
          variants: (vBy.get(p.id) ?? []).map((v) => ({ sku: v.sku, options: v.options as Record<string, string>, priceCents: v.price_cents, active: v.active, stock: v.stock_on_hand, stockPolicy: v.stock_policy })),
        }),
      );
    },

    async get(id) {
      const one = await db.from("products").select("*").eq("id", id).maybeSingle();
      if (one.error) throw new Error(one.error.message);
      const p = one.data;
      if (!p) return null;
      const [vs, ms] = await Promise.all([
        db.from("product_variants").select("*").eq("product_id", id).order("position"),
        db.from("product_media").select("*").eq("product_id", id).order("position"),
      ]);
      const legacy = (p.legacy ?? {}) as { names?: string[]; key?: string };
      return {
        id: p.id, slug: p.slug, title: p.title, category: p.category as CategorySlug, status: p.status, description: p.description,
        specs: (p.specs ?? {}) as Record<string, string>, options: p.options, variants: must(vs).map(toVariant),
        media: must(ms).map((m) => ({ url: m.url, kind: m.kind, alt: m.alt, variantId: m.variant_id, visible: m.visible })), legacy: { names: legacy.names ?? [], key: legacy.key ?? "" },
      };
    },

    async create() {
      const id = newId();
      const code = shortId();
      friendly((await db.from("products").insert({ id, slug: `novo-produto-${code.toLowerCase()}`, title: "Novo produto", category: "pendentes", status: "rascunho" })).error, "O endereço");
      friendly((await db.from("product_variants").insert({ product_id: id, sku: `NOVO-${code}` })).error, "O SKU");
      return id;
    },

    async save(p) {
      friendly((await db.from("products").update(productRow(p)).eq("id", p.id)).error, "O endereço (slug)");
      // primeiro remove as variantes que saíram (libera o SKU), depois grava as demais
      const keep = p.variants.map((v) => v.id);
      friendly((await db.from("product_variants").delete().eq("product_id", p.id).not("id", "in", `(${keep.join(",")})`)).error, "A variante");
      friendly((await db.from("product_variants").upsert(p.variants.map((v, i) => variantRow(p.id, v, i)))).error, "Um dos SKUs");
      friendly((await db.from("product_media").delete().eq("product_id", p.id)).error, "A foto");
      if (p.media.length) {
        const ids = new Set(keep);
        const rows = p.media.map((m, i) => ({
          product_id: p.id, url: m.url, kind: m.kind, alt: m.alt, visible: m.visible, variant_id: m.variantId && ids.has(m.variantId) ? m.variantId : null, position: i,
        }));
        friendly((await db.from("product_media").insert(rows)).error, "A foto");
      }
    },

    async remove(id) {
      friendly((await db.from("products").delete().eq("id", id)).error, "O produto");
    },

    async setStatus(ids, status) {
      for (const part of chunks(ids)) friendly((await db.from("products").update({ status }).in("id", part)).error, "O produto");
    },

    async setPolicy(ids, policy) {
      for (const part of chunks(ids)) friendly((await db.from("product_variants").update({ stock_policy: policy }).in("product_id", part)).error, "A variante");
    },

    async slugTaken(slug, exceptId) {
      const r = must(await db.from("products").select("id").eq("slug", slug).neq("id", exceptId).limit(1));
      return r.length > 0;
    },

    async skuOwner(skus, exceptProductId) {
      if (!skus.length) return null;
      const r = must(await db.from("product_variants").select("sku, product_id").in("sku", skus).neq("product_id", exceptProductId).limit(1));
      if (!r.length) return null;
      const t = await titles([r[0].product_id]);
      return `${r[0].sku} (${t.get(r[0].product_id)?.title ?? "outro produto"})`;
    },

    async stock() {
      const [ps, vs] = await Promise.all([
        all((f, t) => db.from("products").select("id, title, status, options").range(f, t)),
        all((f, t) => db.from("product_variants").select("id, product_id, sku, options, stock_policy, lead_time_days, stock_on_hand, active").range(f, t)),
      ]);
      const pBy = new Map(ps.map((p) => [p.id, p]));
      return vs
        .flatMap((v) => {
          const p = pBy.get(v.product_id);
          if (!p) return [];
          return [{
            variantId: v.id, productId: p.id, product: p.title, status: p.status, sku: v.sku, label: variantLabel({ options: v.options as Record<string, string> }, p.options),
            stockPolicy: v.stock_policy, leadTimeDays: v.lead_time_days, stock: v.stock_on_hand, active: v.active,
          }];
        })
        .sort((a, b) => a.product.localeCompare(b.product, "pt-BR") || a.sku.localeCompare(b.sku));
    },

    async moves(variantId) {
      let q = db.from("stock_movements").select("*").order("created_at", { ascending: false }).limit(300);
      if (variantId) q = q.eq("variant_id", variantId);
      const ms = must(await q);
      if (!ms.length) return [];
      const vs = must(await db.from("product_variants").select("id, product_id, sku, options").in("id", [...new Set(ms.map((m) => m.variant_id))]));
      const vBy = new Map(vs.map((v) => [v.id, v]));
      const pBy = await titles(vs.map((v) => v.product_id));
      const userIds = [...new Set(ms.map((m) => m.user_id).filter((x): x is string => !!x))];
      const people = userIds.length ? must(await db.from("profiles").select("id, name").in("id", userIds)) : [];
      const nameBy = new Map(people.map((u) => [u.id, u.name]));
      return ms.flatMap((m): StockMove[] => {
        const v = vBy.get(m.variant_id);
        const p = v && pBy.get(v.product_id);
        if (!v || !p) return [];
        return [{
          id: String(m.id), variantId: v.id, productId: v.product_id, product: p.title, sku: v.sku, label: variantLabel({ options: v.options as Record<string, string> }, p.options),
          delta: m.delta, reason: m.reason, note: m.note, at: m.created_at, by: (m.user_id && nameBy.get(m.user_id)) || "Equipe",
        }];
      });
    },

    async sell(items, sign, note) {
      const svc = createSupabaseService();
      const ids = items.map((i) => i.variantId);
      const cur = ids.length ? must(await svc.from("product_variants").select("id, stock_policy, stock_on_hand").in("id", ids)) : [];
      const out: Array<{ variantId: string; moved: number }> = [];
      for (const it of items) {
        const v = cur.find((x) => x.id === it.variantId);
        if (!v) continue;
        const moved = sign === 1 ? (it.moved ?? it.qty) : v.stock_policy === "estoque" ? it.qty : Math.min(it.qty, Math.max(0, v.stock_on_hand));
        if (!moved) continue;
        friendly((await svc.from("stock_movements").insert({ variant_id: it.variantId, delta: sign * moved, reason: sign === 1 ? "devolucao" : "venda", note, user_id: null })).error, "O estoque");
        out.push({ variantId: it.variantId, moved });
      }
      return out;
    },

    async move(variantId, delta, reason, note) {
      friendly((await db.from("stock_movements").insert({ variant_id: variantId, delta, reason, note })).error, "O movimento");
    },

    async importProducts(products) {
      const existing = await all((f, t) => db.from("product_variants").select("id, product_id, sku, price_cents").range(f, t));
      const bySku = new Map(existing.map((v) => [v.sku.toUpperCase(), v]));
      const slugs = new Set((await all((f, t) => db.from("products").select("slug").range(f, t))).map((r) => r.slug));
      const pos = (await all((f, t) => db.from("products").select("position").range(f, t))).reduce((m, r) => Math.max(m, r.position), 0);

      const newProducts: ReturnType<typeof productRow>[] = [];
      const newVariants: ReturnType<typeof variantRow>[] = [];
      const priceUpdates: Array<{ id: string; product_id: string; sku: string; price_cents: number | null }> = [];
      const initial: Array<{ variant_id: string; delta: number; reason: "inicial"; note: string }> = [];
      let created = 0, addedVariants = 0;

      products.forEach((np, i) => {
        const owner = np.variants.map((v) => bySku.get(v.sku.toUpperCase())?.product_id).find(Boolean);
        if (!owner) {
          let slug = np.slug;
          for (let k = 2; slugs.has(slug); k++) slug = `${slugify(np.title)}-${k}`;
          slugs.add(slug);
          newProducts.push(productRow({ ...np, slug }, pos + i + 1));
          np.variants.forEach((v, j) => {
            newVariants.push(variantRow(np.id, v, j));
            if (v.stock > 0) initial.push({ variant_id: v.id, delta: v.stock, reason: "inicial", note: "Saldo da planilha" });
          });
          created++;
          return;
        }
        np.variants.forEach((v, j) => {
          const hit = bySku.get(v.sku.toUpperCase());
          if (!hit) {
            newVariants.push(variantRow(owner, v, 100 + j));
            addedVariants++;
          } else if (hit.price_cents !== v.priceCents) priceUpdates.push({ id: hit.id, product_id: hit.product_id, sku: hit.sku, price_cents: v.priceCents });
        });
      });

      for (const part of chunks(newProducts, 100)) friendly((await db.from("products").insert(part)).error, "Um endereço de produto");
      for (const part of chunks(newVariants, 300)) friendly((await db.from("product_variants").insert(part)).error, "Um dos SKUs");
      for (const part of chunks(priceUpdates, 300)) friendly((await db.from("product_variants").upsert(part)).error, "Um dos SKUs");
      for (const part of chunks(initial, 300)) friendly((await db.from("stock_movements").insert(part)).error, "O saldo inicial");
      return { created, addedVariants, updatedPrices: priceUpdates.length };
    },

    async matchTargets() {
      const [ps, vs, ms] = await Promise.all([
        all((f, t) => db.from("products").select("id, title, legacy").range(f, t)),
        all((f, t) => db.from("product_variants").select("product_id, sku").range(f, t)),
        all((f, t) => db.from("product_media").select("product_id, url").range(f, t)),
      ]);
      const vBy = groupBy(vs, (v) => v.product_id);
      const mBy = groupBy(ms, (m) => m.product_id);
      return ps.map((p) => {
        const legacy = (p.legacy ?? {}) as { names?: string[]; key?: string };
        return { id: p.id, title: p.title, key: legacy.key ?? "", names: legacy.names ?? [], skus: (vBy.get(p.id) ?? []).map((v) => v.sku), urls: (mBy.get(p.id) ?? []).map((m) => m.url) };
      });
    },

    async appendMedia(links) {
      if (!links.length) return;
      const ids = [...new Set(links.map((l) => l.productId))];
      const last = new Map<string, number>();
      for (const part of chunks(ids)) {
        for (const r of must(await db.from("product_media").select("product_id, position").in("product_id", part))) last.set(r.product_id, Math.max(last.get(r.product_id) ?? -1, r.position));
      }
      const rows = links.map((l) => {
        const pos = (last.get(l.productId) ?? -1) + 1;
        last.set(l.productId, pos);
        return { product_id: l.productId, url: l.url, kind: l.kind, alt: l.title, visible: l.visible, position: pos };
      });
      for (const part of chunks(rows, 300)) friendly((await db.from("product_media").insert(part)).error, "A mídia");
    },
  };
}
