"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { fetchVideoTitles, importCsv, isMediaCsv, matchMedia, readMediaRows, slugify } from "@/lib/catalog/import";
import { isVideoUrl, mediaKey } from "@/lib/catalog/media";
import { categoryName, PRODUCT_STATUS, productSchema, STOCK_REASON_LABEL, STOCK_REASONS, variantLabel, type ImportResult, type Product } from "@/lib/catalog/types";
import { ctx, run } from "@/server/admin/guard";
import { CATALOG_TAG } from "./public";
import { getCatalogRepo } from "./repo";

/** Ações da loja no painel. Mesmo padrão do resto do painel: exigem equipe logada e devolvem Result. */
async function cat(opts: { admin?: boolean } = {}) {
  const { repo, me } = await ctx(opts);
  return { log: repo.log.bind(repo), me, catalog: await getCatalogRepo() };
}

const publish = () => updateTag(CATALOG_TAG);

/* ---------------- leitura ---------------- */
export async function getProducts() {
  return run(async () => (await cat()).catalog.list());
}
export async function getProductAdmin(id: string) {
  return run(async () => (await cat()).catalog.get(id));
}
export async function getStock() {
  return run(async () => (await cat()).catalog.stock());
}
export async function getStockMoves(variantId?: string) {
  return run(async () => (await cat()).catalog.moves(variantId));
}

/* ---------------- produtos ---------------- */
export async function createProduct() {
  return run(async () => {
    const { catalog, log } = await cat();
    const id = await catalog.create();
    await log("Produto novo criado na loja");
    return id;
  });
}

/** Valida, normaliza (slug, opções das variantes) e confere SKU e endereço únicos antes de gravar. */
export async function saveProduct(input: unknown) {
  return run(async () => {
    const { catalog, log } = await cat();
    const p: Product = productSchema.parse(input);
    p.slug = slugify(p.slug || p.title);
    if (!p.slug) throw new Error("Dê um nome ao produto.");
    p.options = [...new Set(p.options)];
    p.specs = Object.fromEntries(Object.entries(p.specs).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v));

    const skus = new Set<string>();
    const combos = new Set<string>();
    for (const v of p.variants) {
      v.sku = v.sku.trim().toUpperCase();
      if (skus.has(v.sku)) throw new Error(`O SKU ${v.sku} aparece duas vezes.`);
      skus.add(v.sku);
      v.options = Object.fromEntries(p.options.map((o) => [o, (v.options[o] ?? "").trim()]));
      const missing = p.options.find((o) => !v.options[o]);
      if (missing) throw new Error(`Preencha ${missing === "acabamento" ? "o acabamento" : missing === "tamanho" ? "o tamanho" : "a versão"} da variante ${v.sku}.`);
      const key = variantLabel(v, p.options);
      if (p.options.length && combos.has(key)) throw new Error(`Duas variantes com as mesmas opções: ${key}.`);
      combos.add(key);
    }
    if (await catalog.slugTaken(p.slug, p.id)) throw new Error(`Já existe um produto com o endereço /loja/${p.slug}. Mude o nome ou o endereço.`);
    const owner = await catalog.skuOwner([...skus], p.id);
    if (owner) throw new Error(`O SKU ${owner} já existe em outro produto.`);

    const before = await catalog.get(p.id);
    if (!before) throw new Error("Produto não encontrado.");
    const gone = before.variants.filter((v) => v.stock !== 0 && !p.variants.some((x) => x.id === v.id));
    if (gone.length) throw new Error(`A variante ${gone[0].sku} tem ${gone[0].stock} em estoque. Zere o estoque antes de removê-la.`);

    await catalog.save(p);
    await log(p.status === "publicado" ? `Produto ${p.title} publicado na loja` : `Produto ${p.title} salvo como ${p.status}`);
    if (p.status === "publicado" || before.status === "publicado") publish();
    return { slug: p.slug };
  });
}

export async function deleteProduct(id: string) {
  return run(async () => {
    const { catalog, log } = await cat();
    const p = await catalog.get(id);
    if (!p) return;
    await catalog.remove(id);
    await log(`Produto ${p.title} excluído da loja`);
    if (p.status === "publicado") publish();
  });
}

export async function setProductsStatus(ids: string[], status: (typeof PRODUCT_STATUS)[number]) {
  return run(async () => {
    const { catalog, log } = await cat();
    z.array(z.string()).min(1).max(2000).parse(ids);
    z.enum(PRODUCT_STATUS).parse(status);
    await catalog.setStatus(ids, status);
    const word = { publicado: "publicados", rascunho: "movidos para rascunho", arquivado: "arquivados" }[status];
    await log(`${ids.length} ${ids.length === 1 ? "produto" : "produtos"} ${word}`);
    publish();
  });
}

export async function setProductsPolicy(ids: string[], policy: "estoque" | "encomenda") {
  return run(async () => {
    const { catalog, log } = await cat();
    z.array(z.string()).min(1).max(2000).parse(ids);
    z.enum(["estoque", "encomenda"]).parse(policy);
    await catalog.setPolicy(ids, policy);
    await log(`${ids.length} ${ids.length === 1 ? "produto" : "produtos"}: venda ${policy === "encomenda" ? "sob encomenda" : "só pronta entrega"}`);
    publish();
  });
}

/* ---------------- estoque ---------------- */
const moveSchema = z.object({
  variantId: z.string().min(1),
  delta: z.number().int().refine((n) => n !== 0, "Informe uma quantidade diferente de zero.").refine((n) => Math.abs(n) <= 100000, "Quantidade alta demais."),
  reason: z.enum(STOCK_REASONS),
  note: z.string().max(300).default(""),
});

export async function moveStock(input: unknown) {
  return run(async () => {
    const { catalog, log, me } = await cat();
    const m = moveSchema.parse(input);
    await catalog.move(m.variantId, m.delta, m.reason, m.note.trim(), me.name);
    await log(`${STOCK_REASON_LABEL[m.reason]}: ${m.delta > 0 ? "+" : ""}${m.delta} no estoque`);
    publish(); // "pronta entrega" pode mudar na vitrine
  });
}

/* ---------------- importação ---------------- */
/**
 * Importa a planilha da loja antiga. Produtos novos entram como na planilha (publicados ou rascunho);
 * SKUs que já existem só têm o preço atualizado; variantes novas de um produto existente são acrescentadas.
 */
export async function importCatalog(csv: string) {
  return run(async (): Promise<ImportResult & { byCategory: Array<[string, number]> }> => {
    const { catalog, log } = await cat({ admin: true });
    if (typeof csv !== "string" || csv.length < 20) throw new Error("Arquivo vazio.");
    const { products, report } = importCsv(csv);
    if (!products.length) throw new Error("Nenhum produto reconhecido na planilha.");
    const r = await catalog.importProducts(products);
    await log(`Planilha importada: ${r.created} produtos novos, ${r.updatedPrices} preços atualizados`);
    publish();
    return {
      ...r, rows: report.rows, products: report.products, skipped: report.skipped.length,
      byCategory: Object.entries(report.byCategory).map(([k, n]) => [categoryName(k), n]),
    };
  });
}

/**
 * Planilha de fotos/vídeos (colunas SKU e URL). Liga cada link ao produto certo e acrescenta ao fim da galeria.
 * Link repetido em produtos diferentes entra oculto, para a equipe conferir de qual peça é.
 */
export async function importMedia(csv: string) {
  return run(async () => {
    const { catalog, log } = await cat({ admin: true });
    if (typeof csv !== "string" || !isMediaCsv(csv)) throw new Error("A planilha precisa das colunas SKU e URL.");
    const rows = readMediaRows(csv);
    if (!rows.length) throw new Error("Nenhum link encontrado na planilha.");
    // o título público do vídeo costuma trazer o código da peça: ajuda a corrigir links trocados na planilha
    const titles = await fetchVideoTitles(rows.filter((r) => isVideoUrl(r.url)).map((r) => r.url));
    const m = matchMedia(await catalog.matchTargets(), rows, isVideoUrl, mediaKey, titles);
    await catalog.appendMedia(m.links);
    const videos = m.links.filter((l) => l.kind === "video").length;
    await log(`Mídia importada: ${videos} vídeos e ${m.links.length - videos} fotos vinculados`);
    if (m.links.some((l) => l.visible)) publish();
    return {
      rows: m.rows,
      videos,
      images: m.links.length - videos,
      hidden: m.links.filter((l) => !l.visible).map((l) => ({ productId: l.productId, title: l.title, sku: l.sku, note: l.note ?? "" })),
      corrected: m.corrected,
      checkedTitles: titles.size,
      already: m.already,
      unmatched: m.unmatched.map((r) => r.name || r.sku).slice(0, 30),
      unmatchedCount: m.unmatched.length,
    };
  });
}
