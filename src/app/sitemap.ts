import type { MetadataRoute } from "next";
import { getContent } from "@/server/content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brasiliailuminacao.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects } = await getContent();
  return [
    { url: `${SITE}/`, changeFrequency: "monthly", priority: 1 },
    ...projects.map((p) => ({ url: `${SITE}/projetos/${p.slug}`, changeFrequency: "yearly" as const, priority: 0.7 })),
  ];
}
