import "server-only";
import type { MediaLink, MatchTarget } from "@/entities/product";
import type { ImportResult, Product, ProductStatus, ProductSummary, StockMove, StockReason, StockRow, Variant } from "@/entities/product";
import { hasSupabase } from "@/shared/api/supabase/env";
import { demoAllowed } from "@/server/admin/repo";

/** Catálogo da loja no painel. Duas implementações, como o resto do painel: Supabase e demonstração em memória. */
export interface CatalogRepo {
  readonly mode: "supabase" | "demo";
  list(): Promise<ProductSummary[]>;
  get(id: string): Promise<Product | null>;
  create(): Promise<string>;
  save(p: Product): Promise<void>;
  remove(id: string): Promise<void>;
  setStatus(ids: string[], status: ProductStatus): Promise<void>;
  /** Forma de venda de todas as variantes dos produtos (ex.: passar a vender sob encomenda). */
  setPolicy(ids: string[], policy: Variant["stockPolicy"]): Promise<void>;
  slugTaken(slug: string, exceptId: string): Promise<boolean>;
  skuOwner(skus: string[], exceptProductId: string): Promise<string | null>;

  stock(): Promise<StockRow[]>;
  moves(variantId?: string): Promise<StockMove[]>;
  move(variantId: string, delta: number, reason: StockReason, note: string, by: string): Promise<void>;
  /**
   * Baixa (sign -1) ou devolve (sign +1) o estoque de um pedido, pelo sistema (sem login da equipe).
   * Variante "só pronta entrega" baixa a quantidade toda; "sob encomenda" só consome o que houver em estoque.
   */
  sell(items: Array<{ variantId: string; qty: number; moved?: number }>, sign: -1 | 1, note: string): Promise<Array<{ variantId: string; moved: number }>>;

  importProducts(products: Product[]): Promise<Omit<ImportResult, "rows" | "products" | "skipped">>;
  /** Produtos com SKUs, nomes antigos e links já cadastrados, para ligar fotos e vídeos de uma planilha. */
  matchTargets(): Promise<MatchTarget[]>;
  /** Acrescenta fotos/vídeos ao fim da galeria de cada produto. */
  appendMedia(links: MediaLink[]): Promise<void>;
}

export async function getCatalogRepo(): Promise<CatalogRepo> {
  if (hasSupabase) return (await import("./repo-supabase")).supabaseCatalog();
  if (demoAllowed()) return (await import("./repo-demo")).demoCatalog();
  throw new Error("Painel indisponível: configure o Supabase.");
}

export const newId = () => crypto.randomUUID();
export const shortId = () => newId().slice(0, 6).toUpperCase();
