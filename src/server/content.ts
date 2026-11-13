import "server-only";
import { unstable_cache } from "next/cache";
import { seedContent } from "@/entities/site-content";
import { normalizeSettings, normalizeSectionOrder, SECTION_KEYS, sectionSchema, type Project, type SectionKey, type Section, type SiteContent } from "@/entities/site-content";
import { hasSupabase } from "@/shared/api/supabase/env";
import { createSupabasePublic } from "@/shared/api/supabase/server";
import { demoAllowed } from "@/server/admin/repo";
import { getDemoAdminStore } from "@/server/admin/repo-demo";

/** Tags de cache: publicar no painel chama revalidateTag(tag) e o site atualiza. */
export const TAGS = { content: "content", projects: "projects" } as const;

/** Modo demonstração do painel (sem Supabase): o site mostra o que foi publicado lá, enquanto o servidor estiver de pé. */
function fromDemo(): SiteContent | null {
  if (!demoAllowed()) return null;
  const d = getDemoAdminStore();
  const sections = { ...seedContent.sections };
  for (const s of d.sections) sections[s.key] = s.published;
  return {
    sectionOrder: normalizeSectionOrder(d.sections.map((section) => section.key)),
    sections,
    settings: normalizeSettings(d.settings),
    projects: d.projects.filter((p) => p.status === "publicado").map((p) => ({ ...p, gallery: p.gallery.map((g) => ({ ...g, alt: g.alt || p.title })) })),
    testimonials: d.testimonials.filter((t) => t.visible).map((t) => ({ id: t.id, quote: t.a, author: t.b, location: t.c ?? "", visible: true })),
    faqs: d.faqs.filter((f) => f.visible).map((f) => ({ id: f.id, question: f.a, answer: f.b, visible: true })),
  };
}

async function loadContent(): Promise<SiteContent> {
  if (!hasSupabase) return fromDemo() ?? seedContent;
  const db = createSupabasePublic();
  const [sec, set, proj, imgs, tst, faq] = await Promise.all([
    db.from("sections").select("key, published, position").order("position"),
    db.from("settings").select("data").eq("id", 1).maybeSingle(),
    db.from("projects").select("*").eq("status", "publicado").order("position"),
    db.from("project_images").select("project_id, url, alt, layout, position").order("position"),
    db.from("testimonials").select("*").eq("visible", true).order("position"),
    db.from("faqs").select("*").eq("visible", true).order("position"),
  ]);
  if (sec.error) {
    console.error("[content] falha ao ler seções, usando conteúdo inicial", sec.error.message);
    return seedContent;
  }

  const sections = { ...seedContent.sections };
  for (const row of sec.data ?? []) {
    if ((SECTION_KEYS as readonly string[]).includes(row.key)) {
      const parsed = sectionSchema.safeParse(row.published);
      if (parsed.success) sections[row.key as SectionKey] = parsed.data;
    }
  }
  const projects: Project[] = (proj.data ?? []).map((p) => ({
    id: p.id, slug: p.slug, title: p.title, category: p.category, location: p.location, year: p.year, summary: p.summary,
    scope: p.scope, cover: p.cover_url, status: p.status,
    gallery: (imgs.data ?? []).filter((g) => g.project_id === p.id).map((g) => ({ url: g.url, alt: g.alt || p.title, layout: g.layout })),
  }));

  return {
    sectionOrder: normalizeSectionOrder((sec.data ?? []).map((section) => section.key)),
    sections,
    settings: normalizeSettings({ ...seedContent.settings, ...((set.data?.data as object) ?? {}) }),
    projects,
    testimonials: (tst.data ?? []).map((t) => ({ id: t.id, quote: t.quote, author: t.author, location: t.location, visible: t.visible })),
    faqs: (faq.data ?? []).map((f) => ({ id: f.id, question: f.question, answer: f.answer, visible: f.visible })),
  };
}

/** Todo o conteúdo publicado, em cache até alguém publicar no painel. */
export const getContent = hasSupabase ? unstable_cache(loadContent, ["site-content"], { tags: [TAGS.content, TAGS.projects], revalidate: 3600 }) : loadContent;

export async function getProject(slug: string) {
  const c = await getContent();
  const i = c.projects.findIndex((p) => p.slug === slug);
  if (i < 0) return null;
  return { project: c.projects[i], next: c.projects[(i + 1) % c.projects.length], index: i };
}

export function visibleSection(s: Section) {
  return s.visible !== false;
}
