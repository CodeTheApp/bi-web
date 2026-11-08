/**
 * Gera supabase/seed.sql a partir do conteúdo inicial (src/lib/content/seed.ts).
 * Uso: npm run db:seed-sql
 */
import { seedContent } from "../src/lib/content/seed";
import { SECTION_KEYS } from "../src/lib/content/schema";

const q = (v: unknown) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const out: string[] = ["-- Gerado por scripts/generate-seed.ts — conteúdo inicial do protótipo aprovado", "begin;"];

SECTION_KEYS.forEach((key, i) => {
  const s = seedContent.sections[key];
  out.push(`insert into public.sections (key, draft, published, position) values (${q(key)}, ${j(s)}, ${j(s)}, ${i}) on conflict (key) do update set draft = excluded.draft, published = excluded.published, position = excluded.position;`);
});
out.push(`insert into public.settings (id, data) values (1, ${j(seedContent.settings)}) on conflict (id) do update set data = excluded.data;`);

seedContent.projects.forEach((p, i) => {
  out.push(`with p as (insert into public.projects (slug, title, category, location, year, summary, scope, cover_url, status, position) values (${q(p.slug)}, ${q(p.title)}, ${q(p.category)}, ${q(p.location)}, ${q(p.year)}, ${q(p.summary)}, array[${p.scope.map(q).join(", ")}]::text[], ${q(p.cover)}, ${q(p.status)}, ${i}) on conflict (slug) do nothing returning id)`);
  out.push(`insert into public.project_images (project_id, url, alt, layout, position) select p.id, v.url, v.alt, v.layout, v.pos from p, (values ${p.gallery.map((g, k) => `(${q(g.url)}, ${q(g.alt)}, ${q(g.layout)}, ${k})`).join(", ")}) as v(url, alt, layout, pos);`);
});

const urls = new Set<string>();
seedContent.projects.forEach((p) => { urls.add(p.cover); p.gallery.forEach((g) => urls.add(g.url)); });
["/img/camila.jpg", "/img/escada.jpg", "/img/pendentes.jpg", "/img/prod-1.jpg", "/img/prod-2.jpg", "/img/prod-3.jpg", "/img/prod-4.jpg"].forEach((u) => urls.add(u));
out.push(`insert into public.media (url, alt) values ${[...urls].map((u) => `(${q(u)}, '')`).join(", ")};`);

seedContent.testimonials.forEach((t, i) => out.push(`insert into public.testimonials (quote, author, location, position, visible) values (${q(t.quote)}, ${q(t.author)}, ${q(t.location)}, ${i}, true);`));
seedContent.faqs.forEach((f, i) => out.push(`insert into public.faqs (question, answer, position, visible) values (${q(f.question)}, ${q(f.answer)}, ${i}, true);`));
out.push("commit;");
console.log(out.join("\n"));
