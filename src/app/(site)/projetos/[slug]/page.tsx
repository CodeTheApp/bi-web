import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageMotion } from "@/components/site/motion/PageMotion";
import { ProjectScenes } from "@/components/site/projeto/ProjectScenes";
import { waLink } from "@/lib/links";
import { getContent, getProject } from "@/server/content";

export const dynamicParams = true;

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

  // galeria: a primeira "cheia", depois os pares, e o restante vai para a faixa horizontal
  const full = p.gallery.filter((g) => g.layout === "cheia");
  const pairs = p.gallery.filter((g) => g.layout === "par");
  const strip = [...p.gallery.filter((g) => g.layout === "faixa"), { url: p.cover, alt: p.title, layout: "faixa" as const }];
  const pairRows: Array<typeof pairs> = [];
  for (let i = 0; i < pairs.length; i += 2) pairRows.push(pairs.slice(i, i + 2));

  return (
    <main>
      <section className="p-hero" data-nav="dark">
        <div className="wrap">
          <div className="crumb">
            <a href="/#portfolio">← Portfólio</a>
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

      {(full.length > 0 || pairRows.length > 0) && (
        <section className="gal">
          <div className="wrap">
            {full.map((g) => (
              <div className="g-full" data-clip key={g.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={g.alt} data-parallax="8" loading="lazy" />
              </div>
            ))}
            {pairRows.map((row, i) => (
              <div className="g-pair" key={i}>
                {row.map((g, k) => (
                  <div data-clip key={g.url}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt={g.alt} data-parallax={k ? "10" : "8"} loading="lazy" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="strip" id="strip">
        <div className="strip-pin">
          <div className="wrap head">
            <div>
              <span className="label">Em cena</span>
              <h2 className="h-m" style={{ marginTop: 18, color: "var(--marrom-intenso)" }}>Cada ambiente, uma cena de luz.</h2>
            </div>
            <div className="count-wrap">
              <span className="count">
                <span id="sNow">01</span>
                <span style={{ opacity: 0.35 }}> / {String(strip.length).padStart(2, "0")}</span>
              </span>
              <div className="nav-arrows">
                <button id="railPrev" type="button" aria-label="Foto anterior">←</button>
                <button id="railNext" type="button" aria-label="Próxima foto">→</button>
              </div>
            </div>
          </div>
          <div className="rail" id="rail" tabIndex={0} aria-label="Fotos do projeto, role para o lado">
            {strip.map((g, i) => (
              <figure key={g.url + i}>
                <div className="im">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.url} alt={g.alt} loading="lazy" />
                </div>
                <figcaption>
                  {p.title} · {String(i + 1).padStart(2, "0")}
                </figcaption>
              </figure>
            ))}
            <div style={{ flex: "0 0 1px" }} />
          </div>
        </div>
      </section>

      <section className="quote">
        <div className="wrap">
          <span className="label">Brasília Iluminação</span>
          <p data-split>
            Você jogou <span className="amber">luz</span> sobre algo que não passa mais despercebido e se valoriza.
          </p>
          <div className="acts">
            <a className="btn" href="/#contato">
              Quero um projeto assim <span className="ar">→</span>
            </a>
            <a className="ulink" style={{ color: "var(--ambar-queimado)" }} href={waLink(settings, `Olá! Vi o projeto ${p.title} no site.`)} target="_blank" rel="noopener">
              Falar no WhatsApp <span className="ar">↗</span>
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
              <span className="arrow">→</span>
            </div>
          </div>
        </a>
      )}

      <ProjectScenes />
      <PageMotion />
    </main>
  );
}
