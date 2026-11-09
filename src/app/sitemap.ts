import type { MetadataRoute } from "next";
import { getCatalog } from "@/server/catalog/public";
import { getContent } from "@/server/content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brasiliailuminacao.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ projects }, products] = await Promise.all([getContent(), getCatalog()]);
  return [
    { url: `${SITE}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE}/loja`, changeFrequency: "weekly", priority: 0.9 },
    ...projects.map((p) => ({ url: `${SITE}/projetos/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${SITE}/loja/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
