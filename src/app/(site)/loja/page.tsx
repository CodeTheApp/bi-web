import "@/styles/loja.css";
import type { Metadata } from "next";
import { ActiveChips, FilterPanel, Pager } from "@/components/site/loja/Filters";
import { ProductCard } from "@/components/site/loja/ProductCard";
import { ShopToolbar } from "@/components/site/loja/Toolbar";
import { PageMotion } from "@/components/site/motion/PageMotion";
import { browse, readState } from "@/lib/catalog/browse";
import { CATEGORIES } from "@/lib/catalog/types";
import { waLink } from "@/lib/links";
import { getCatalog } from "@/server/catalog/public";
import { getContent } from "@/server/content";

export async function generateMetadata({ searchParams }: PageProps<"/loja">): Promise<Metadata> {
  const s = readState(await searchParams);
  const cat = CATEGORIES.find((c) => c.slug === s.categoria);
  return {
    title: cat ? `${cat.name} · Loja` : "Loja",
    description: "Pendentes, lustres, arandelas e luminárias escolhidos com o olhar dos projetos da Brasília Iluminação. Escolha o acabamento e compre online ou com uma consultora.",
    alternates: { canonical: cat ? `/loja?categoria=${cat.slug}` : "/loja" },
    // buscas e combinações de filtro não precisam aparecer no Google
    robots: s.q || s.cor.length || s.preco || s.pronta || s.video || s.ordem || s.pagina > 1 ? { index: false, follow: true } : undefined,
  };
}

export default async function LojaPage({ searchParams }: PageProps<"/loja">) {
  const s = readState(await searchParams);
  const [all, { settings }] = await Promise.all([getCatalog(), getContent()]);
  const r = browse(all, s);
  const cat = CATEGORIES.find((c) => c.slug === s.categoria);
  const panel = <FilterPanel r={r} />;

  return (
    <main className="shop">
      <section className="shop-hero" data-nav="dark">
        <div className="wrap">
          <span className="label" data-up>
            Loja
          </span>
          <h1 className="h-l" data-up>
            A luz certa, <span className="amber">peça por peça.</span>
          </h1>
          <p data-up>
            Pendentes, lustres, arandelas e luminárias escolhidos com o mesmo olhar dos nossos projetos. Escolha o acabamento e compre aqui, com Pix ou cartão, ou com uma consultora pelo WhatsApp.
          </p>
        </div>
      </section>

      <section className="shop-list" id="produtos">
        <div className="wrap shop-body">
          <aside className="shop-side" aria-label="Filtros">
            {panel}
          </aside>
          <div className="shop-main">
            <div className="shop-head">
              <h2 className="h-m">{s.q ? `Busca: “${s.q}”` : cat ? cat.name : "Todas as peças"}</h2>
            </div>
            <ShopToolbar q={s.q} total={r.total} sorts={r.sorts} sort={s.ordem} searchBase={r.searchBase} activeFilters={r.activeFilters} panel={panel} />
            <ActiveChips r={r} />
            {r.list.length ? (
              <div className="shop-grid">
                {r.list.map((p, i) => (
                  <ProductCard key={p.id} p={p} priority={i < 4} />
                ))}
              </div>
            ) : (
              <div className="shop-empty">
                <p className="h-m">{all.length ? "Nada com esses filtros." : "A loja está sendo montada."}</p>
                <p className="muted">
                  {all.length
                    ? "Tire algum filtro ou fale com uma consultora: ela encontra a peça certa para o seu espaço."
                    : "Fale com uma consultora: ela encontra a peça certa para o seu espaço."}
                </p>
                <div className="acts">
                  {r.chips.length > 0 && (
                    <a className="ulink" href={r.clearHref}>
                      Limpar filtros <span className="ar">→</span>
                    </a>
                  )}
                  <a className="btn" href={waLink(settings, "Olá! Estou procurando uma luminária e gostaria de ajuda.")} target="_blank" rel="noopener">
                    Falar no WhatsApp <span className="ar">→</span>
                  </a>
                </div>
              </div>
            )}
            <Pager r={r} />
          </div>
        </div>
      </section>
      <PageMotion />
    </main>
  );
}
