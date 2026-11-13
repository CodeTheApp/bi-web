import { coverOf } from "@/entities/product";
import type { Section } from "@/entities/site-content";
import { getCatalog } from "@/server/catalog/public";
import { ShopPreviewView } from "./ShopPreviewView";

export async function ShopPreview({ section, consultantHref }: { section: Section; consultantHref: string }) {
  const products = [...await getCatalog()].sort((a, b) => Number(Boolean(coverOf(b.media))) - Number(Boolean(coverOf(a.media)))).slice(0, 4);
  return <ShopPreviewView section={section} consultantHref={consultantHref} products={products} />;
}
