import { ArrowLeft, ArrowRight, ArrowUpRight } from "@/shared/ui/icons/lucide";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageMotion } from "@/shared/ui/motion/PageMotion";
import { ProjectScenes, ProjectGallery } from "@/widgets/project-gallery";
import { waLink } from "@/entities/site-content";
import { getContent, getProject } from "@/server/content";

export async function generateStaticParams() {
  const { projects } = await getContent();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/projetos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const hit = await getProject(slug);
  if (!hit) return {};
  const { project: p } = hit;
  return {
    title: p.title,
    description: p.summary,
    alternates: { canonical: `/projetos/${p.slug}` },
    openGraph: { title: p.title, description: p.summary, images: [p.cover] },
  };
}

export default async function ProjectPage({ params }: PageProps<"/projetos/[slug]">) {
  const { slug } = await params;
  const hit = await getProject(slug);
  if (!hit) notFound();
  const { project: p, next, index } = hit;
  const { settings } = await getContent();

  return (
    <main>
      <section className="p-hero" data-nav="dark">
        <div className="wrap">
          <div className="crumb">
            <a href="/#portfolio"><ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" /> Portfólio</a>
            <span>/</span>
            <span>{String(index + 1).padStart(2, "0")}</span>
          </div>
          <h1 className="h-xl" id="pTitle">{p.title}</h1>
          <dl className="meta" id="pMeta">
            {[["Categoria", p.category], ["Local", p.location], ["Ano", p.year], ["Serviço", p.scope[0] ?? "Projeto luminotécnico"]].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="cover-wrap">
          <div className="cover" id="cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="pCover" src={p.cover} alt={p.title} fetchPriority="high" />
          </div>
        </div>
        <div className="fill" />
      </section>

      <section className="p-intro">
        <div className="wrap grid">
          <span className="label">O projeto</span>
          <div>
            <p className="lightup" id="pText">{p.summary}</p>
            <div className="scope" id="pScope">
              {p.scope.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ProjectGallery photos={[{ url: p.cover, alt: p.title }, ...p.gallery]} title={p.title} />

      <section className="quote">
        <div className="wrap">
          <span className="label">Brasília Iluminação</span>
          <p data-split>
            Você jogou <span className="amber">luz</span> sobre algo que não passa mais despercebido e se valoriza.
          </p>
          <div className="acts">
            <a className="btn" href="/#contato">
              Quero um projeto assim <ArrowRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
            </a>
            <a className="ulink" style={{ color: "var(--ambar-queimado)" }} href={waLink(settings, `Olá! Vi o projeto ${p.title} no site.`)} target="_blank" rel="noopener">
              Falar no WhatsApp <ArrowUpRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {next && next.slug !== p.slug && (
        <a className="next" id="next" href={`/projetos/${next.slug}`} data-nav="dark">
          <div className="bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={next.cover} alt="" loading="lazy" />
          </div>
          <div className="wrap">
            <span className="label">Próximo projeto</span>
            <div className="row">
              <h2 className="h-xl" id="nTitle">{next.title}</h2>
              <span className="arrow"><ArrowRight size={36} strokeWidth={1.5} aria-hidden="true" /></span>
            </div>
          </div>
        </a>
      )}

      <ProjectScenes />
      <PageMotion />
    </main>
  );
}
