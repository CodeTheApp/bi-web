import { notFound, redirect } from "next/navigation";
import { SECTION_KEYS, type SectionKey } from "@/entities/site-content";
import { getRepo } from "@/server/admin/repo";
import { getContent } from "@/server/content";
import { LiveHomePreview } from "@/widgets/home";
import { coverOf } from "@/entities/product";
import { getCatalog } from "@/server/catalog/public";
import "@/styles/site.css";
import "@/styles/shop.css";
import "@/features/page-preview/ui/preview-frame.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prévia do rascunho", robots: { index: false, follow: false } };

export default async function SectionPreview({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTION_KEYS as readonly string[]).includes(section)) notFound();
  const repo = await getRepo();
  if (!await repo.me()) redirect("/admin/login");
  const [content, rows, catalog] = await Promise.all([getContent(), repo.sections(), section === "loja" ? getCatalog() : Promise.resolve([])]);
  const key = section as SectionKey;
  const row = rows.find((row) => row.key === key);
  const products = [...catalog].sort((a, b) => Number(Boolean(coverOf(b.media))) - Number(Boolean(coverOf(a.media)))).slice(0, 4);
  return <LiveHomePreview content={{ ...content, sections: { ...content.sections, ...(row ? { [key]: row.draft } : {}) } }} sectionKey={key} shopProducts={products} />;
}
