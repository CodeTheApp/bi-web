import type { Metadata } from "next";
import { CobogoWall } from "@/components/site/home/CobogoWall";
import { ContactForm } from "@/components/site/home/ContactForm";
import { Faq } from "@/components/site/home/Faq";
import { Hero } from "@/components/site/home/Hero";
import { HomeScenes } from "@/components/site/home/HomeScenes";
import { Testimonials } from "@/components/site/home/Testimonials";
import { PageMotion } from "@/components/site/motion/PageMotion";
import { paragraphs, rich } from "@/components/site/rich";
import { igLink, waLink } from "@/lib/links";
import { getContent } from "@/server/content";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getContent();
  return { title: { absolute: settings.seoTitle }, description: settings.seoDescription || undefined, alternates: { canonical: "/" } };
}

// Peças decorativas das formas de trabalhar (combinações dos quartos de círculo do manual)
const TILES = [
  [["q-br"], ["q-bl", "var(--ambar-golden)"], ["q-tr", "var(--marrom-calmo)"], ["q-tl"]],
  [["h-b", "var(--marrom-intenso)"], ["q-bl"], ["q-tr", "var(--marrom-calmo)"], ["h-t", "var(--ambar-golden)"]],
  [["q-tl", "var(--marrom-calmo)"], ["q-tr"], ["q-bl", "var(--ambar-golden)"], ["q-br", "var(--marrom-intenso)"]],
  [["h-t"], ["q-br", "var(--marrom-intenso)"], ["q-tl", "var(--ambar-golden)"], ["h-b", "var(--marrom-calmo)"]],
] as const;
const MODE_CTA = ["Quero o projeto", "Quero só o projeto", "Quero os produtos", "Compre pelo WhatsApp"];
const LUMI_IMGS = [
  ["/img/apt-2.jpg", "Sala de estar com cortinas e luz indireta"],
  ["/img/pendentes.jpg", "Pendentes esféricos iluminando sala de jantar"],
  ["/img/escada.jpg", "Escada helicoidal iluminada por pendentes"],
  ["/img/prod-1.jpg", "Luminária de mesa em bronze"],
] as const;
const PRODS = [
  ["/img/prod-1.jpg", "Luminária de mesa bronze sem fio"],
  ["/img/prod-3.jpg", "Luminária de mesa preta"],
  ["/img/prod-4.jpg", "Luminária de mesa em mesa de jantar"],
  ["/img/prod-2.jpg", "Luminária de mesa cônica"],
] as const;
const OFFER_ICONS = [
  <svg key="a" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M5 31V15L18 5l13 10v16z" /><path d="M14 31V21h8v10" /></svg>,
  <svg key="b" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M18 33s11-10.2 11-18a11 11 0 0 0-22 0c0 7.8 11 18 11 18z" /><circle cx="18" cy="15" r="4" /></svg>,
  <svg key="c" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M13 27h10M14 31h8M18 4a9 9 0 0 0-5 16.5V24h10v-3.5A9 9 0 0 0 18 4z" /></svg>,
];
const MARQUEE = ["Projeto luminotécnico", "Curadoria", "Paisagismo", "Comercial"];
const nn = (i: number) => String(i + 1).padStart(2, "0");

export default async function Home() {
  const { sections: S, settings, projects, testimonials, faqs } = await getContent();
  const wa = waLink(settings);
  const heroProject = projects.find((p) => p.cover === S.hero.image || p.gallery.some((g) => g.url === S.hero.image)) ?? projects[0];
  const stepCaptions = S.lumi.items.map((it, i) => `${nn(i)} — ${it.title}`);

  return (
    <main>
      <Hero variant={settings.hero} section={S.hero} credit={heroProject ? { title: heroProject.title, href: `/projetos/${heroProject.slug}` } : null} />

      {S.quem.visible && (
        <section className="intro" id="quem-somos">
          <div className="wrap">
            <span className="label" data-up>{S.quem.label}</span>
            <p className="lightup" id="lightup">
              {rich(S.quem.title, "manifesto")} {rich(S.quem.text, "manifesto")}
            </p>
            {S.quem.items.length > 0 && (
              <div className="pillars">
                {S.quem.items.map((it) => {
                  const [num, unit = ""] = it.title.split("|");
                  const [h3, ...rest] = it.text.split(" — ");
                  const n = Number(num);
                  return (
                    <div className="pillar" key={it.title}>
                      <div className="ln" data-line />
                      <div className="big">
                        <span data-count={Number.isFinite(n) ? n : undefined}>{num}</span>
                        <sup>{unit}</sup>
                      </div>
                      <h3>{rest.length ? h3 : ""}</h3>
                      <p>{rest.length ? rest.join(" — ") : it.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <div className="marq" aria-hidden="true">
        <div className="row">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className={i % 2 ? "o" : undefined}>
              {m} {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/feixe.svg" alt="" />
            </span>
          ))}
        </div>
      </div>

      {S.formas.visible && (
        <section className="modes" id="servicos">
          <div className="modes-pin">
            <div className="head">
              <span className="label">{S.formas.label}</span>
              <h2 className="h-m" style={{ marginTop: 20, color: "var(--marrom-intenso)" }}>{S.formas.title}</h2>
            </div>
            <div className="track" id="track">
              <div className="intro-panel">
                <div>
                  <span className="label">{S.formas.label}</span>
                  <h2 className="h-l" style={{ marginTop: 26, color: "var(--marrom-intenso)" }} data-split>{S.formas.title}</h2>
                  <p>{S.formas.text}</p>
                </div>
                <span className="ulink" style={{ color: "var(--ambar-queimado)" }}>
                  Arraste ou role <span className="ar">→</span>
                </span>
              </div>
              {S.formas.items.map((it, i) => {
                const last = i === S.formas.items.length - 1 && i === 3;
                return (
                  <article className={`mcard${i === 0 ? " feat" : ""}`} key={it.title}>
                    <div className="top">
                      <span className="n">{nn(i)}</span>
                      {i === 0 && <span className="tag">Mais completa</span>}
                    </div>
                    <div className="tile" style={{ marginTop: 34 }}>
                      {TILES[i % TILES.length].map(([cls, bg], k) => (
                        <i key={k} className={cls} style={bg ? { background: bg } : undefined} />
                      ))}
                    </div>
                    <h3>{it.title}</h3>
                    <p>{rich(it.text)}</p>
                    {last ? (
                      <a className="ulink" href={wa} target="_blank" rel="noopener">
                        {MODE_CTA[3]} <span className="ar">↗</span>
                      </a>
                    ) : (
                      <a className="ulink" href="#contato">
                        {MODE_CTA[i] ?? "Fale conosco"} <span className="ar">→</span>
                      </a>
                    )}
                  </article>
                );
              })}
              <div style={{ flex: "0 0 var(--gutter)" }} />
            </div>
            <div className="prog">
              <i id="modesProg" />
            </div>
          </div>
        </section>
      )}

      {S.camila.visible && (
        <section className="camila">
          <div className="wrap grid">
            <div className="ph">
              <div className="frame" data-clip>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={S.camila.image || "/img/camila.jpg"} alt={`${S.camila.title}, arquiteta e fundadora`} data-parallax="8" loading="lazy" />
              </div>
              <div className="badge" aria-hidden="true">
                <svg viewBox="0 0 132 132" className="spin">
                  <defs>
                    <path id="circ" d="M66,66 m-48,0 a48,48 0 1,1 96,0 a48,48 0 1,1 -96,0" />
                  </defs>
                  <text fontFamily="Montserrat" fontSize="9.4" fontWeight="600" letterSpacing="3.1" fill="#291007">
                    <textPath href="#circ">CADA PROJETO · UMA ASSINATURA · </textPath>
                  </text>
                </svg>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/feixe-escuro.svg" alt="" />
              </div>
            </div>
            <div className="txt">
              <span className="label" data-up>{S.camila.label}</span>
              <h2 className="h-l" data-split>{S.camila.title}</h2>
              {paragraphs(S.camila.text).map((para, i) => (
                <p key={i} data-up={i ? ".1" : ""}>{rich(para)}</p>
              ))}
              {S.camila.items.length > 0 && (
                <div className="creds" data-stagger>
                  {S.camila.items.map((c) => (
                    <span key={c.title}>{c.title}</span>
                  ))}
                </div>
              )}
              <div className="sig" data-up>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/feixe.svg" alt="" />
                Especialista fundadora da Brasília Iluminação
              </div>
            </div>
          </div>
        </section>
      )}

      {S.lumi.visible && (
        <section className="lumi dark" id="luminotecnico" data-nav="dark">
          <div className="wrap pin" id="lumiPin">
            <div>
              <span className="label">{S.lumi.label}</span>
              <h2 className="h-l" data-split>{S.lumi.title}</h2>
              <p className="lead" data-up>{rich(S.lumi.text)}</p>
              <div className="steps">
                <div className="rail">
                  <i id="rail" />
                </div>
                {S.lumi.items.map((it, i) => (
                  <div className={`step${i === 0 ? " on" : ""}`} key={it.title}>
                    <span className="k">{nn(i)}</span>
                    <h3>{it.title}</h3>
                    <p>{it.text}</p>
                  </div>
                ))}
              </div>
              <div className="cta">
                <a className="btn" href="#contato" data-magnetic=".3">
                  {S.lumi.cta || "Faça seu orçamento"} <span className="ar">→</span>
                </a>
              </div>
            </div>
            <div className="stack" id="stack">
              {LUMI_IMGS.slice(0, Math.max(1, S.lumi.items.length)).map(([src, alt]) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt={alt} loading="lazy" />
              ))}
              <span className="cap" id="cap">{stepCaptions[0]}</span>
            </div>
          </div>
        </section>
      )}

      <section className="wall-sec">
        <div className="wrap head">
          <h2 className="h-l" style={{ color: "var(--marrom-intenso)", maxWidth: 900 }} data-split>
            Onde a luz vira <span className="amber">emoção</span> na sua vida.
          </h2>
          <p data-up>Os padrões da marca nascem dos azulejos de Athos Bulcão e dos cobogós de Brasília: uma peça simples que se repete e cria ritmo, luz e sombra.</p>
        </div>
        <CobogoWall />
      </section>

      {projects.length > 0 && (
        <section className="port" id="portfolio">
          <div className="wrap">
            <div className="head">
              <div>
                <span className="label" data-up>Portfólio</span>
                <h2 className="h-l" style={{ marginTop: 24, color: "var(--marrom-intenso)" }} data-split>Projetos que viram experiência.</h2>
              </div>
              <p className="muted" style={{ maxWidth: 360 }} data-up>Uma seleção de projetos autorais de iluminação, do residencial ao comercial.</p>
            </div>
            {projects.map((p, i) => (
              <article className={`proj${i % 2 ? " rev" : ""}`} key={p.slug}>
                <a className="media" href={`/projetos/${p.slug}`} data-clip data-cursor="Ver projeto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.cover} alt={p.title} data-parallax="8" loading="lazy" />
                </a>
                <div className="info" data-stagger>
                  <span className="n">{nn(i)}</span>
                  <span className="cat">{p.category} · {p.location}</span>
                  <h3>{p.title}</h3>
                  <p>{p.summary}</p>
                  <a className="ulink" href={`/projetos/${p.slug}`}>
                    Ver projeto <span className="ar">→</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {S.loja.visible && (
        <section className="loja" id="loja">
          <div className="wrap grid">
            <div className="txt">
              <span className="label" data-up>{S.loja.label}</span>
              <h2 className="h-l" style={{ marginTop: 24, color: "var(--marrom-intenso)" }} data-split>{S.loja.title}</h2>
              <p data-up>{rich(S.loja.text)}</p>
              <div className="acts" data-up>
                <a className="btn" href={settings.shopUrl} target="_blank" rel="noopener" data-magnetic=".3">
                  {S.loja.cta || "Visite a loja"} <span className="ar">↗</span>
                </a>
                <a className="ulink" style={{ color: "var(--ambar-queimado)" }} href={wa} target="_blank" rel="noopener">
                  Falar com consultora <span className="ar">→</span>
                </a>
              </div>
            </div>
            <div className="prods">
              {PRODS.map(([src, alt]) => (
                <a key={src} href={settings.shopUrl} target="_blank" rel="noopener" data-clip data-cursor="Loja ↗">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={alt} loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {S.oferta.visible && (
        <section className="offer">
          <div className="wrap">
            <span className="label" data-up>{S.oferta.label}</span>
            <h2 className="h-l" style={{ marginTop: 24, color: "var(--marrom-intenso)" }} data-split>{S.oferta.title}</h2>
            <div className="cols" data-stagger>
              {S.oferta.items.map((it, i) => (
                <div className="col" key={it.title}>
                  {OFFER_ICONS[i % OFFER_ICONS.length]}
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {S.depoimentos.visible && <Testimonials label={S.depoimentos.label} items={testimonials} />}
      {S.faq.visible && <Faq label={S.faq.label} title={S.faq.title} items={faqs} />}

      <section className="contato dark" id="contato" data-nav="dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sym-bg" src="/img/bi-claro.svg" alt="" aria-hidden="true" />
        <div className="wrap">
          <span className="label" data-up>{S.contato.label}</span>
          <h2 className="h-xl" data-split>
            {S.contato.title} {S.contato.title2 && <span className="amber">{S.contato.title2}</span>}
          </h2>
          <div className="grid">
            <ContactForm cta={S.contato.cta} />
            <aside data-stagger>
              <div>
                <h4>WhatsApp</h4>
                <a className="big" href={wa} target="_blank" rel="noopener">{settings.whatsapp}</a>
              </div>
              <div>
                <h4>Instagram</h4>
                <a className="big" href={igLink(settings)} target="_blank" rel="noopener">{settings.instagram}</a>
              </div>
              <div>
                <h4>Localização</h4>
                <p>
                  Brasília, DF.
                  <br />
                  Atendemos e entregamos para todo o Brasil.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <HomeScenes stepCaptions={stepCaptions} />
      <PageMotion />
    </main>
  );
}
