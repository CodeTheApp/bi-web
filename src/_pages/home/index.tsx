import type { Metadata } from "next";
import { getContent } from "@/server/content";
import { HomeContent } from "@/widgets/home";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return { title: { absolute: settings.seoTitle }, description: settings.seoDescription || undefined, alternates: { canonical: "/" } };
}

export default async function Home() {
  return <HomeContent content={await getContent()} />;
}
