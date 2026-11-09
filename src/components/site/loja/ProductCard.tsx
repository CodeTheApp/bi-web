import { coverOf } from "@/lib/catalog/media";
import { brl, canSell, CATEGORIES, type PublicProduct } from "@/lib/catalog/types";
import { swatch } from "@/lib/catalog/swatch";
import { FavButton } from "../shop/FavButton";
import { ProductArt } from "./ProductArt";

/** "Pendente Goda Chapéu" → rótulo "Pendente" e nome "Goda Chapéu". */
export function splitTitle(p: Pick<PublicProduct, "title" | "category">) {
  const singular = CATEGORIES.find((c) => c.slug === p.category)?.singular ?? "";
  const name = singular && p.title.toLowerCase().startsWith(`${singular.toLowerCase()} `) ? p.title.slice(singular.length + 1) : p.title;
  return {
    label: singular,
    name: name.charAt(0).toUpperCase() + name.slice(1),
  };
}

export function priceFrom(p: PublicProduct) {
  const prices = p.variants
    .filter(canSell)
    .map((v) => v.priceCents)
    .filter((c): c is number => c != null && c > 0);
  if (!prices.length) return "Sob consulta";
  const min = Math.min(...prices);
  return Math.max(...prices) > min ? `a partir de ${brl(min)}` : brl(min);
}

export function finishesOf(p: PublicProduct) {
  return [...new Set(p.variants.map((v) => v.options.acabamento).filter(Boolean))];
}

export function ProductCard({ p, priority }: { p: PublicProduct; priority?: boolean }) {
  const { label, name } = splitTitle(p);
  const cover = coverOf(p.media);
  const hasVideo = p.media.some((m) => m.kind === "video");
  const finishes = finishesOf(p);
  const dots = finishes.map((f) => [f, swatch(f)] as const).filter(([, c]) => c);
  return (
    <div className="pcard">
      <a className="plink" href={`/loja/${p.slug}`}>
        <div className={`pimg${cover ? "" : " art"}`}>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.src} alt={p.title} loading={priority ? "eager" : "lazy"} className={cover.tall ? "tall" : undefined} />
          ) : (
            <ProductArt category={p.category} className="pa" />
          )}
          {p.variants.some((v) => v.inStock) && <span className="pill">Pronta entrega</span>}
          {hasVideo && (
            <span className="vtag" aria-label="Tem vídeo">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5.5v13l11-6.5z" />
              </svg>
              Vídeo
            </span>
          )}
        </div>
        <div className="pinfo">
          <span className="pcat">{label}</span>
          <h3>{name}</h3>
          <p className="price">{priceFrom(p)}</p>
          {finishes.length > 1 && (
            <div className="sw" aria-label={`${finishes.length} acabamentos`}>
              {dots.slice(0, 7).map(([f, c]) => (
                <i key={f} title={f} style={{ background: c! }} />
              ))}
              <small>{finishes.length} acabamentos</small>
            </div>
          )}
        </div>
      </a>
      <FavButton id={p.id} title={p.title} className="pfav" />
    </div>
  );
}
