import { coverOf } from "@/entities/product";
import type { SectionKey, SiteContent } from "@/entities/site-content";
import { getCatalog } from "@/server/catalog/public";
import { HomeContentView } from "./HomeContentView";

export async function HomeContent({ content, onlySection }: { content: SiteContent; onlySection?: SectionKey }) {
  const needsCatalog = onlySection === "loja" || (!onlySection && content.sections.loja.visible);
  const products = !needsCatalog ? [] : [...await getCatalog()].sort((a, b) => Number(Boolean(coverOf(b.media))) - Number(Boolean(coverOf(a.media)))).slice(0, 4);
  return <HomeContentView content={content} onlySection={onlySection} shopProducts={products} />;
}
