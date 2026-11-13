import { z } from "zod";
import { coverOf } from "@/entities/product/model/media";

/** Categorias da loja, na ordem da vitrine. */
export const CATEGORIES = [
  { slug: "pendentes", name: "Pendentes", short: "Pendentes", singular: "Pendente" },
  { slug: "lustres", name: "Lustres", short: "Lustres", singular: "Lustre" },
  { slug: "arandelas", name: "Arandelas", short: "Arandelas", singular: "Arandela" },
  { slug: "abajures", name: "Abajures e luminárias de mesa", short: "Abajures", singular: "Abajur" },
  { slug: "colunas", name: "Colunas de piso", short: "Colunas", singular: "Coluna" },
  { slug: "colunas-de-parede", name: "Colunas de parede", short: "De parede", singular: "Coluna de parede" },
  { slug: "plafons", name: "Plafons", short: "Plafons", singular: "Plafon" },
  { slug: "sobrepor", name: "Luminárias de sobrepor", short: "Sobrepor", singular: "Luminária de sobrepor" },
  { slug: "spots", name: "Spots", short: "Spots", singular: "Spot" },
  { slug: "modulos", name: "Módulos de LED", short: "Módulos", singular: "Módulo" },
] as const;
export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];
export const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

/** Opções de variante. A ordem aqui é a ordem em que aparecem para o cliente. */
export const OPTION_TYPES = [
  { id: "acabamento", name: "Acabamento" },
  { id: "tamanho", name: "Tamanho" },
  { id: "versao", name: "Versão" },
] as const;
export type OptionType = (typeof OPTION_TYPES)[number]["id"];
export const optionName = (id: string) => OPTION_TYPES.find((o) => o.id === id)?.name ?? id;

export const PRODUCT_STATUS = ["rascunho", "publicado", "arquivado"] as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[number];
export const STOCK_POLICY = ["estoque", "encomenda"] as const;
export const STOCK_REASONS = ["inicial", "compra", "venda", "ajuste", "devolucao"] as const;
export type StockReason = (typeof STOCK_REASONS)[number];
export const STOCK_REASON_LABEL: Record<StockReason, string> = {
  inicial: "Saldo inicial",
  compra: "Entrada de compra",
  venda: "Saída por venda",
  ajuste: "Ajuste de inventário",
  devolucao: "Devolução",
};

/** Ficha técnica: campos conhecidos (todos opcionais). Valores como o cliente lê. */
export const SPEC_FIELDS = [
  { key: "lampadas", label: "Lâmpadas" },
  { key: "base", label: "Base" },
  { key: "potencia", label: "Potência" },
  { key: "temperatura", label: "Temperatura de cor" },
  { key: "fluxo", label: "Fluxo luminoso" },
  { key: "irc", label: "IRC" },
  { key: "ip", label: "Grau de proteção" },
  { key: "dimerizavel", label: "Dimerizável" },
  { key: "bateria", label: "Bateria" },
  { key: "dimensoes", label: "Dimensões" },
  { key: "acabamento", label: "Acabamento" },
] as const;

export const specsSchema = z.record(z.string().max(40), z.string().max(160));

export const variantSchema = z.object({
  id: z.string(),
  sku: z.string().trim().min(1, "Informe o SKU").max(60),
  options: z.record(z.string(), z.string().max(80)),
  priceCents: z.number().int().min(0).nullable(),
  compareAtCents: z.number().int().min(0).nullable().default(null),
  stockPolicy: z.enum(STOCK_POLICY),
  leadTimeDays: z.number().int().min(0).max(365).nullable().default(null),
  stock: z.number().int().default(0),
  active: z.boolean(),
  legacyName: z.string().default(""),
});
export type Variant = z.infer<typeof variantSchema>;

export const MEDIA_KINDS = ["imagem", "video"] as const;
export const mediaSchema = z.object({
  url: z.string().trim().min(1),
  kind: z.enum(MEDIA_KINDS).default("imagem"),
  alt: z.string().max(200).default(""),
  variantId: z.string().nullable().default(null),
  visible: z.boolean().default(true), // oculta = fica guardada no painel, não aparece na loja
});
export type ProductMedia = z.infer<typeof mediaSchema>;

export const productSchema = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Use só letras minúsculas, números e hífen").max(120),
  title: z.string().trim().min(2, "Dê um nome ao produto").max(140),
  category: z.enum(CATEGORY_SLUGS),
  status: z.enum(PRODUCT_STATUS),
  description: z.string().max(4000).default(""),
  specs: specsSchema.default({}),
  options: z.array(z.string()).default([]), // tipos de opção usados, na ordem
  variants: z.array(variantSchema).min(1, "O produto precisa de pelo menos uma variante"),
  media: z.array(mediaSchema).default([]),
  legacy: z.object({ names: z.array(z.string()).default([]), key: z.string().default("") }).default({ names: [], key: "" }),
});
export type Product = z.infer<typeof productSchema>;

/**
 * Regra da loja: só aparece o que pode ser vendido. Uma variante vende se tem saldo ou se foi marcada
 * "sob encomenda"; o produto sem nenhuma variante vendável sai da loja sozinho (mesmo publicado)
 * e volta quando entra estoque.
 */
export const canSell = (v: { active?: boolean; stockPolicy: Variant["stockPolicy"]; stock?: number; inStock?: boolean }) =>
  v.active !== false && ((v.stock ?? 0) > 0 || v.inStock === true || v.stockPolicy === "encomenda");

/** Resumo para listas (vitrine e painel). */
export type ProductSummary = {
  id: string;
  slug: string;
  title: string;
  category: CategorySlug;
  status: ProductStatus;
  cover: string | null;
  minCents: number | null;
  maxCents: number | null;
  variants: number;
  finishes: string[];
  inStock: boolean;
  stock: number;
  skus: string[];
  photos: number;
  videos: number;
  hiddenMedia: number;
  /** alguma variante ativa com saldo ou sob encomenda */
  sellable: boolean;
  /** publicado e vendável: está na loja agora */
  onSale: boolean;
};

type SummarySource = Pick<Product, "id" | "slug" | "title" | "category" | "status"> & {
  media: Array<Pick<ProductMedia, "url" | "kind" | "visible">>;
  variants: Array<Pick<Variant, "sku" | "options" | "priceCents" | "active" | "stockPolicy"> & { stock?: number; inStock?: boolean }>;
};

export function summarize(p: SummarySource): ProductSummary {
  const active = p.variants.filter((v) => v.active);
  const prices = (active.length ? active : p.variants).map((v) => v.priceCents).filter((c): c is number => c != null && c > 0);
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    category: p.category,
    status: p.status,
    cover: coverOf(p.media)?.src ?? null,
    minCents: prices.length ? Math.min(...prices) : null,
    maxCents: prices.length ? Math.max(...prices) : null,
    variants: p.variants.length,
    finishes: [...new Set(active.map((v) => v.options.acabamento).filter(Boolean))],
    inStock: active.some((v) => (v.stock ?? 0) > 0 || v.inStock === true),
    stock: p.variants.reduce((s, v) => s + Math.max(0, v.stock ?? 0), 0),
    skus: p.variants.map((v) => v.sku),
    photos: p.media.filter((m) => m.kind === "imagem" && m.visible).length,
    videos: p.media.filter((m) => m.kind === "video" && m.visible).length,
    hiddenMedia: p.media.filter((m) => !m.visible).length,
    sellable: p.variants.some(canSell),
    onSale: p.status === "publicado" && p.variants.some(canSell),
  };
}

/* ---------------- vitrine ---------------- */
/** O que o site recebe: sem saldo exato, sem nomes da planilha antiga, só variantes ativas. */
export type PublicVariant = Omit<Variant, "stock" | "legacyName" | "active"> & { inStock: boolean };
export type PublicProduct = Omit<Product, "variants" | "legacy" | "status"> & { variants: PublicVariant[] };

export function toPublic(p: Product): PublicProduct {
  return {
    id: p.id, slug: p.slug, title: p.title, category: p.category, description: p.description, specs: p.specs, options: p.options,
    media: p.media.filter((m) => m.visible),
    variants: p.variants
      .filter((v) => v.active)
      .map((v) => ({ id: v.id, sku: v.sku, options: v.options, priceCents: v.priceCents, compareAtCents: v.compareAtCents, stockPolicy: v.stockPolicy, leadTimeDays: v.leadTimeDays, inStock: v.stock > 0 })),
  };
}

/** "Preto · Ø 42 × 13 cm" */
export const variantLabel = (v: Pick<Variant, "options">, options: string[]) => options.map((o) => v.options[o]).filter(Boolean).join(" · ");

/** Prazo que o cliente lê. */
export function availability(v: Pick<PublicVariant, "inStock" | "stockPolicy" | "leadTimeDays">) {
  if (v.inStock) return "Pronta entrega";
  if (v.stockPolicy === "estoque") return "Esgotado";
  if (v.leadTimeDays) return `Sob encomenda · cerca de ${v.leadTimeDays} dias úteis`;
  return "Sob encomenda";
}

/* ---------------- painel ---------------- */
export type StockRow = {
  variantId: string;
  productId: string;
  product: string;
  status: ProductStatus;
  sku: string;
  label: string;
  stockPolicy: Variant["stockPolicy"];
  leadTimeDays: number | null;
  stock: number;
  active: boolean;
};

export type StockMove = { id: string; variantId: string; productId: string; product: string; sku: string; label: string; delta: number; reason: StockReason; note: string; at: string; by: string };

export type ImportResult = { rows: number; products: number; created: number; addedVariants: number; updatedPrices: number; skipped: number };

export const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
