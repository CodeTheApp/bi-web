import { ArrowRight } from "@/shared/ui/icons/lucide";
import "@/styles/loja.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageMotion } from "@/shared/ui/motion/PageMotion";
import { ProductCard, priceFrom, splitTitle } from "@/features/shopping";
import { ProductView } from "@/widgets/product-detail";
import { CATEGORIES, optionName, SPEC_FIELDS, type PublicProduct } from "@/entities/product";
import { coverOf } from "@/entities/product";
import { getProductPage } from "@/server/catalog/public";
import { getContent } from "@/server/content";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.brasiliailuminacao.com.br";

// páginas geradas na primeira visita e guardadas até o produto mudar no painel
export async function generateStaticParams() {
  return [];
}

function summary(p: PublicProduct) {
  if (p.description) return p.description.slice(0, 160);
  const fin = new Set(p.variants.map((v) => v.options.acabamento).filter(Boolean)).size;
  return `${p.title}${fin > 1 ? ` em ${fin} acabamentos` : ""}, ${priceFrom(p).toLowerCase()}. Compre com uma consultora da Brasília Iluminação.`;
}

export async function generateMetadata({ params }: PageProps<"/loja/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const hit = await getProductPage(slug);
  if (!hit) return {};
  const p = hit.product;
  return {
    title: p.title,
    description: summary(p),
    alternates: { canonical: `/loja/${p.slug}` },
    openGraph: { title: p.title, description: summary(p), images: coverOf(p.media) ? [coverOf(p.media)!.src] : undefined },
  };
}

export default async function ProductPage({ params }: PageProps<"/loja/[slug]">) {
  const { slug } = await params;
  const hit = await getProductPage(slug);
  if (!hit) notFound();
  const { product: p, related } = hit;
  const { settings } = await getContent();
  const { label, name } = splitTitle(p);
  const cat = CATEGORIES.find((c) => c.slug === p.category)!;
  const url = `${SITE}/loja/${p.slug}`;

  // ficha: campos conhecidos na ordem da marca, depois os extras; opções com mais de um valor viram "disponível em"
  const specs = [
    ...SPEC_FIELDS.filter((f) => p.specs[f.key]).map((f) => [f.label, p.specs[f.key]] as const),
    ...Object.entries(p.specs).filter(([k]) => !SPEC_FIELDS.some((f) => f.key === k)),
  ];
  const offered = p.options
    .map((o) => [optionName(o), [...new Set(p.variants.map((v) => v.options[o]).filter(Boolean))]] as const)
    .filter(([, vs]) => vs.length > 1);

  const prices = p.variants.map((v) => v.priceCents).filter((c): c is number => c != null && c > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: summary(p),
    sku: p.variants[0].sku,
    category: cat.name,
    brand: { "@type": "Brand", name: "Brasília Iluminação" },
    ...(p.media.some((m) => m.kind === "imagem")
      ? { image: p.media.filter((m) => m.kind === "imagem").map((m) => (m.url.startsWith("http") ? m.url : `${SITE}${m.url}`)) }
      : null),
    ...(prices.length
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: (Math.min(...prices) / 100).toFixed(2),
            highPrice: (Math.max(...prices) / 100).toFixed(2),
            offerCount: p.variants.length,
            availability: p.variants.some((v) => v.inStock) ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
            url,
          },
        }
      : null),
  };

  return (
    <main className="shop pdp-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="pdp">
        <div className="wrap">
          <nav className="s-crumb" aria-label="Você está em">
            <a href="/loja">Loja</a>
            <span>/</span>
            <a href={`/loja?categoria=${cat.slug}`}>{cat.name}</a>
          </nav>
          <ProductView product={p} label={label} name={name} whatsapp={settings.whatsapp} url={url} />
        </div>
      </section>

      {(p.description || specs.length > 0 || offered.length > 0) && (
        <section className="pdp-more">
          <div className="wrap">
            <div className="txt" data-up>
              <span className="label">Sobre a peça</span>
              {p.description ? (
                p.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p className="muted">Quer ver a peça de perto ou entender se combina com o seu espaço? Uma consultora ajuda pelo WhatsApp, com fotos e medidas.</p>
              )}
            </div>
            <dl className="specs" data-up>
              {offered.map(([k, vs]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{vs.join(" · ")}</dd>
                </div>
              ))}
              {specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="pdp-rel">
          <div className="wrap">
            <div className="shop-head">
              <h2 className="h-m" data-up>
                Mais {cat.name.toLowerCase()}
              </h2>
              <a className="ulink" href={`/loja?categoria=${cat.slug}`}>
                Ver todos <ArrowRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </div>
            <div className="shop-grid" data-up>
              {related.map((r) => (
                <ProductCard key={r.id} p={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="pdp-cta" data-nav="dark">
        <div className="wrap">
          <span className="label">Projeto luminotécnico</span>
          <p className="h-m">Não sabe qual peça escolher? A gente desenha a luz da sua casa inteira.</p>
          <a className="btn" href="/#contato">
            Agende uma conversa <ArrowRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </section>
      <PageMotion />
    </main>
  );
}
