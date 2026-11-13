import { ArrowRight, ArrowUpRight } from "@/shared/ui/icons/lucide";
import { coverOf, lightOnFor } from "@/entities/product";
import type { PublicProduct } from "@/entities/product";
import type { Section } from "@/entities/site-content";
import { priceFrom, splitTitle } from "@/features/shopping";
import { ProductArt } from "@/entities/product";
import { rich } from "@/shared/lib/rich";
import "@/widgets/home/ui/ShopPreview.css";

/** The same public shop composition, with a server-supplied catalogue. */
export function ShopPreviewView({ section, consultantHref, products }: { section: Section; consultantHref: string; products: PublicProduct[] }) {
  return (
    <section className="loja" id="loja" aria-labelledby="home-shop-title">
      <div className="wrap">
        <div className="shop-preview-header">
          <div>
            <span className="label" data-up>{section.label}</span>
            <h2 className="h-l shop-preview-heading" id="home-shop-title" data-up>{section.title}</h2>
          </div>
          <p className="shop-preview-description" data-up>{rich(section.text)}</p>
        </div>

        {products.length > 0 && (
          <div className="shop-preview-products">
            {products.map((product) => {
              const cover = coverOf(product.media);
              const lightOn = cover ? lightOnFor(product.media, cover.src) : null;
              const { label, name } = splitTitle(product);
              return (
                <article className="shop-preview-product" key={product.id} data-up>
                  <a className="shop-preview-link" href={`/loja/${product.slug}`}>
                    <div className={`shop-preview-image${lightOn ? " has-light-pair" : ""}`}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.src} alt={product.title} loading="lazy" />
                      ) : <ProductArt category={product.category} className="shop-preview-drawing" />}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {lightOn && <img className="product-light-on" src={lightOn} alt="" aria-hidden="true" loading="lazy" />}
                      <span className="shop-preview-arrow" aria-hidden="true"><ArrowUpRight size={18} strokeWidth={1.5} /></span>
                    </div>
                    <div className="shop-preview-info">
                      <span className="shop-preview-category">{label}</span>
                      <h3>{name}</h3>
                      <p className="shop-preview-price">{priceFrom(product)}</p>
                    </div>
                  </a>
                </article>
              );
            })}
          </div>
        )}

        <div className="shop-preview-footer" data-up>
          <a className="btn" href="/loja">
            {section.cta.trim() || "Ver todos os produtos"} <ArrowRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>
          <a className="ulink shop-preview-consultant" href={consultantHref} target="_blank" rel="noopener">
            Falar com consultora <ArrowRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
