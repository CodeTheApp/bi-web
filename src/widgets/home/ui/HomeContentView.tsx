import {
  ArrowRight,
  ArrowUpRight,
  House,
  Lightbulb,
  MapPin,
} from "@/shared/ui/icons/lucide";
import "@/styles/public-icons.css";
import { Fragment, type ReactNode } from "react";
import {
  normalizeSectionOrder,
  type SectionKey,
  type SiteContent,
} from "@/entities/site-content";
import { lumiImageOf } from "@/entities/site-content";
import { CobogoWall } from "@/widgets/home/ui/CobogoWall";
import { ContactForm } from "@/widgets/home/ui/ContactForm";
import { Faq } from "@/widgets/home/ui/Faq";
import { Hero, type HeroSlide } from "@/widgets/home/ui/Hero";
import { HomeScenes } from "@/widgets/home/ui/HomeScenes";
import { ShopPreviewView } from "./ShopPreviewView";
import type { PublicProduct } from "@/entities/product";
import { Testimonials } from "@/widgets/home/ui/Testimonials";
import { PageMotion } from "@/shared/ui/motion/PageMotion";
import { paragraphs, rich } from "@/shared/lib/rich";
import { brandOf, companyOf, igLink, waLink } from "@/entities/site-content";

// Peças decorativas das formas de trabalhar (combinações dos quartos de círculo do manual)
const TILES = [
  [
    ["q-br"],
    ["q-bl", "var(--ambar-golden)"],
    ["q-tr", "var(--marrom-calmo)"],
    ["q-tl"],
  ],
  [
    ["h-b", "var(--marrom-intenso)"],
    ["q-bl"],
    ["q-tr", "var(--marrom-calmo)"],
    ["h-t", "var(--ambar-golden)"],
  ],
  [
    ["q-tl", "var(--marrom-calmo)"],
    ["q-tr"],
    ["q-bl", "var(--ambar-golden)"],
    ["q-br", "var(--marrom-intenso)"],
  ],
  [
    ["h-t"],
    ["q-br", "var(--marrom-intenso)"],
    ["q-tl", "var(--ambar-golden)"],
    ["h-b", "var(--marrom-calmo)"],
  ],
] as const;
const MODE_CTA = [
  "Quero o projeto",
  "Quero só o projeto",
  "Quero os produtos",
  "Compre pelo WhatsApp",
];
const OFFER_ICONS = [
  <House key="a" size={36} strokeWidth={1.6} aria-hidden="true" />,
  <MapPin key="b" size={36} strokeWidth={1.6} aria-hidden="true" />,
  <Lightbulb key="c" size={36} strokeWidth={1.6} aria-hidden="true" />,
];
const nn = (i: number) => String(i + 1).padStart(2, "0");

export function HomeContentView({
  content,
  onlySection,
  shopProducts,
}: {
  content: SiteContent;
  onlySection?: SectionKey;
  shopProducts: PublicProduct[];
}) {
  const {
    sections: S,
    sectionOrder,
    settings,
    projects,
    testimonials,
    faqs,
  } = content;
  const wa = waLink(settings);
  const company = companyOf(settings);
  // hero: a foto escolhida no painel e as capas de mais dois projetos, cada uma com o crédito do projeto
  const creditFor = (url: string) => {
    const p = projects.find(
      (x) => x.cover === url || x.gallery.some((g) => g.url === url),
    );
    return p
      ? {
          title: p.title,
          place: p.location || p.category,
          href: `/projetos/${p.slug}`,
        }
      : null;
  };
  const heroImage = S.hero.image || projects[0]?.cover || "/img/hero.jpg";
  const heroSlides: HeroSlide[] = [
    {
      src: heroImage,
      alt: creditFor(heroImage)?.title ?? "Projeto de iluminação",
      credit: creditFor(heroImage),
    },
    ...projects
      .filter(
        (p) =>
          p.cover &&
          p.cover !== heroImage &&
          creditFor(heroImage)?.href !== `/projetos/${p.slug}`,
      )
      .slice(0, 2)
      .map((p) => ({
        src: p.cover,
        alt: p.title,
        credit: {
          title: p.title,
          place: p.location || p.category,
          href: `/projetos/${p.slug}`,
        },
      })),
  ];
  const stepCaptions = S.lumi.items.map((it, i) => `${nn(i)} — ${it.title}`);
  const lumiImages = S.lumi.items.length
    ? S.lumi.items.map(lumiImageOf)
    : [lumiImageOf(undefined, 0)];

  const blocks: Record<SectionKey, ReactNode> = {
    hero: <Hero section={S.hero} slides={heroSlides} />,

    quem: (
      <section className="intro" id="quem-somos">
        <div className="wrap">
          <span className="label" data-up>
            {S.quem.label}
          </span>
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
                      <span data-count={Number.isFinite(n) ? n : undefined}>
                        {num}
                      </span>
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
    ),

    faixa: S.faixa.items.length > 0 && (
      <div className="marq" aria-hidden="true">
        <div className="row">
          {[...S.faixa.items, ...S.faixa.items].map((item, i) => (
            <span key={i} className={i % 2 ? "o" : undefined}>
              {item.title}{" "}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/feixe.svg" alt="" />
            </span>
          ))}
        </div>
      </div>
    ),

    formas: (
      <section className="modes" id="servicos">
        <div className="modes-pin">
          <div className="head">
            <span className="label">{S.formas.label}</span>
            <h2
              className="h-m"
              style={{ marginTop: 20, color: "var(--marrom-intenso)" }}
            >
              {S.formas.title}
            </h2>
          </div>
          <div className="track" id="track" data-stagger>
            <div className="intro-panel">
              <div>
                <span className="label">{S.formas.label}</span>
                <h2
                  className="h-l"
                  style={{ marginTop: 26, color: "var(--marrom-intenso)" }}
                  data-split
                >
                  {S.formas.title}
                </h2>
                <p>{S.formas.text}</p>
              </div>
              <a
                className="ulink"
                style={{ color: "var(--ambar-queimado)" }}
                href="#contato"
              >
                Não sabe qual escolher? Fale com a gente{" "}
                <ArrowRight
                  className="ar"
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </a>
            </div>
            {S.formas.items.map((it, i) => {
              const last = i === S.formas.items.length - 1 && i === 3;
              return (
                <article
                  className={`mcard${i === 0 ? " feat" : ""}`}
                  key={it.title}
                >
                  <div className="top">
                    <span className="n">{nn(i)}</span>
                    {i === 0 && <span className="tag">Mais completa</span>}
                  </div>
                  <div className="tile" style={{ marginTop: 34 }}>
                    {TILES[i % TILES.length].map(([cls, bg], k) => (
                      <i
                        key={k}
                        className={cls}
                        style={bg ? { background: bg } : undefined}
                      />
                    ))}
                  </div>
                  <h3>{it.title}</h3>
                  <p>{rich(it.text)}</p>
                  {last ? (
                    <a
                      className="ulink"
                      href={wa}
                      target="_blank"
                      rel="noopener"
                    >
                      {MODE_CTA[3]}{" "}
                      <ArrowUpRight
                        className="ar"
                        size={18}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </a>
                  ) : (
                    <a className="ulink" href="#contato">
                      {MODE_CTA[i] ?? "Fale conosco"}{" "}
                      <ArrowRight
                        className="ar"
                        size={18}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    ),

    camila: (
      <section className="camila">
        <div className="wrap grid">
          <div className="ph">
            <div className="frame" data-clip>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={S.camila.image || "/img/camila.jpg"}
                alt={`${S.camila.title}, arquiteta e fundadora`}
                data-parallax="8"
                loading="lazy"
              />
            </div>
            <div className="badge" aria-hidden="true">
              <svg viewBox="0 0 132 132" className="spin">
                <defs>
                  <path
                    id="circ"
                    d="M66,66 m-48,0 a48,48 0 1,1 96,0 a48,48 0 1,1 -96,0"
                  />
                </defs>
                <text
                  fontFamily="Montserrat"
                  fontSize="9.4"
                  fontWeight="600"
                  letterSpacing="3.1"
                  fill="#291007"
                >
                  <textPath href="#circ">
                    CADA PROJETO · UMA ASSINATURA ·{" "}
                  </textPath>
                </text>
              </svg>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/feixe-escuro.svg" alt="" />
            </div>
          </div>
          <div className="txt">
            <span className="label" data-up>
              {S.camila.label}
            </span>
            <h2 className="h-l" data-split>
              {S.camila.title}
            </h2>
            {paragraphs(S.camila.text).map((para, i) => (
              <p key={i} data-up={i ? ".1" : ""}>
                {rich(para)}
              </p>
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
    ),

    lumi: (
      <section className="lumi dark" id="luminotecnico" data-nav="dark">
        <div className="wrap pin" id="lumiPin">
          <div>
            <span className="label">{S.lumi.label}</span>
            <h2 className="h-l" data-split>
              {S.lumi.title}
            </h2>
            <p className="lead" data-up>
              {rich(S.lumi.text)}
            </p>
            <div className="steps">
              <div className="rail">
                <i id="rail" />
              </div>
              {S.lumi.items.map((it, i) => (
                <div
                  className={`step${i === 0 ? " on atual" : ""}`}
                  key={it.title}
                >
                  <span className="k">{nn(i)}</span>
                  <h3>{it.title}</h3>
                  <p>{it.text}</p>
                </div>
              ))}
            </div>
            <div className="cta">
              <a className="btn" href="#contato">
                {S.lumi.cta || "Faça seu orçamento"}{" "}
                <ArrowRight
                  className="ar"
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>
          <div className="stack" id="stack">
            {lumiImages.map(({ src, alt }, index) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`${src}-${index}`} src={src} alt={alt} loading="lazy" />
            ))}
            <span className="cap" id="cap">
              {stepCaptions[0]}
            </span>
          </div>
        </div>
      </section>
    ),

    cobogos: (
      <section className="wall-sec">
        <div className="wrap head">
          <div style={{ maxWidth: 900 }}>
            {S.cobogos.label && (
              <span className="label" style={{ marginBottom: 20 }} data-up>
                {S.cobogos.label}
              </span>
            )}
            <h2
              className="h-l"
              style={{ color: "var(--marrom-intenso)" }}
              data-split
            >
              {S.cobogos.title.split(/(\*[^*]+\*)/g).map((part, index) =>
                part.startsWith("*") && part.endsWith("*") ? (
                  <span className="amber" key={index}>
                    {part.slice(1, -1)}
                  </span>
                ) : (
                  part
                ),
              )}
            </h2>
          </div>
          {S.cobogos.text && <p data-up>{rich(S.cobogos.text)}</p>}
        </div>
        <CobogoWall />
      </section>
    ),

    portfolio: projects.length > 0 && (
      <section className="port" id="portfolio">
        <div className="wrap">
          <div className="head">
            <div>
              <span className="label" data-up>
                {S.portfolio.label}
              </span>
              <h2
                className="h-l"
                style={{ marginTop: 24, color: "var(--marrom-intenso)" }}
                data-split
              >
                {S.portfolio.title}
              </h2>
            </div>
            <p className="muted" style={{ maxWidth: 360 }} data-up>
              {rich(S.portfolio.text)}
            </p>
          </div>
          {projects.map((p, i) => (
            <article className={`proj${i % 2 ? " rev" : ""}`} key={p.slug}>
              <a className="media" href={`/projetos/${p.slug}`} data-clip>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.cover}
                  alt={p.title}
                  data-parallax="8"
                  loading="lazy"
                />
              </a>
              <div className="info" data-stagger>
                <span className="n">{nn(i)}</span>
                <span className="cat">
                  {p.category} · {p.location}
                </span>
                <h3>{p.title}</h3>
                <p>{p.summary}</p>
                <a className="ulink" href={`/projetos/${p.slug}`}>
                  Ver projeto{" "}
                  <ArrowRight
                    className="ar"
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    ),

    loja: (
      <ShopPreviewView
        section={S.loja}
        consultantHref={wa}
        products={shopProducts}
      />
    ),

    oferta: (
      <section className="offer">
        <div className="wrap">
          <span className="label" data-up>
            {S.oferta.label}
          </span>
          <h2
            className="h-l"
            style={{ marginTop: 24, color: "var(--marrom-intenso)" }}
            data-split
          >
            {S.oferta.title}
          </h2>
          <div className="cols" data-stagger>
            {S.oferta.items.map((it, i) => (
              <div className="col" key={it.title} data-icon-scope="">
                {OFFER_ICONS[i % OFFER_ICONS.length]}
                <h3>{it.title}</h3>
                <p>{it.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),

    depoimentos: (
      <Testimonials label={S.depoimentos.label} items={testimonials} />
    ),
    faq: <Faq label={S.faq.label} title={S.faq.title} items={faqs} />,

    contato: (
      <section className="contato dark" id="contato" data-nav="dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="sym-bg"
          src={brandOf(settings).symbolLight}
          alt=""
          aria-hidden="true"
        />
        <div className="wrap">
          <span className="label" data-up>
            {S.contato.label}
          </span>
          <h2 className="h-xl" data-split>
            {S.contato.title}{" "}
            {S.contato.title2 && (
              <span className="amber">{S.contato.title2}</span>
            )}
          </h2>
          {S.contato.text.trim() && (
            <p className="contact-intro" data-up>
              {rich(S.contato.text)}
            </p>
          )}
          <div className="grid">
            <ContactForm cta={S.contato.cta} />
            <aside data-stagger>
              <div>
                <h4>WhatsApp</h4>
                <a className="big" href={wa} target="_blank" rel="noopener">
                  {settings.whatsapp}
                </a>
              </div>
              <div>
                <h4>Instagram</h4>
                <a
                  className="big"
                  href={igLink(settings)}
                  target="_blank"
                  rel="noopener"
                >
                  {settings.instagram}
                </a>
              </div>
              <div>
                <h4>Localização</h4>
                <p>
                  {company.address && (
                    <>
                      {company.address}
                      <br />
                    </>
                  )}
                  {company.city && (
                    <>
                      {company.city}
                      <br />
                    </>
                  )}
                  Atendemos e entregamos para todo o Brasil.
                </p>
                {company.mapsUrl && (
                  <a
                    href={company.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver no mapa
                  </a>
                )}
              </div>
              {company.serviceHours && (
                <div>
                  <h4>Atendimento</h4>
                  <p>{company.serviceHours}</p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <main>
      {normalizeSectionOrder(sectionOrder)
        .filter((key) => (onlySection ? key === onlySection : S[key].visible))
        .map((key) => (
          <Fragment key={key}>{blocks[key]}</Fragment>
        ))}
      {!onlySection && (
        <>
          <HomeScenes stepCaptions={stepCaptions} />
          <PageMotion />
        </>
      )}
    </main>
  );
}
