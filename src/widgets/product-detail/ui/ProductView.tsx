"use client";
import { ChevronLeft, ChevronRight, Play } from "@/shared/ui/icons/lucide";

/* eslint-disable @next/next/no-img-element -- Product media can use external image and video thumbnail URLs. */
import ParticleButton from "@/shared/ui/kokonutui/particle-button";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useQueryStates } from "nuqs";
import { productSearchParams } from "@/features/product-selection";
import { lightOnFor, parseVideo } from "@/entities/product";
import { swatch } from "@/entities/product";
import {
  availability,
  brl,
  canSell,
  optionName,
  variantLabel,
  type ProductMedia,
  type PublicProduct,
  type PublicVariant,
} from "@/entities/product";
import { waNumberLink } from "@/entities/site-content";
import { installmentsFor } from "@/entities/order";
import { FavButton, Qty, ShippingCalc, useShop } from "@/features/shopping";
import { ProductArt } from "@/entities/product";

/** Topo da página do produto: fotos e vídeos, escolha da variante, preço, prazo, sacola e favoritos. */
type ProductViewProps = {
  product: PublicProduct;
  label: string;
  name: string;
  whatsapp: string;
  url: string;
};

export function ProductView(props: ProductViewProps) {
  return (
    <Suspense
      fallback={
        <div className="pdp-grid" aria-busy="true">
          <div className="pdp-gal">
            <div className="stage">
              <div className="frame art">
                <ProductArt category={props.product.category} className="pa" />
              </div>
            </div>
          </div>
          <div className="pdp-info">
            <span className="pcat">{props.label}</span>
            <h1>{props.name}</h1>
            <p>Carregando opções da peça…</p>
          </div>
        </div>
      }
    >
      <ProductDetails {...props} />
    </Suspense>
  );
}

function ProductDetails({
  product: p,
  label,
  name,
  whatsapp,
  url,
}: ProductViewProps) {
  const shop = useShop();
  const first = p.variants.find(canSell) ?? p.variants[0];
  const [selection, setSelection] = useQueryStates(productSearchParams, {
    shallow: true,
    scroll: false,
    history: "replace",
  });
  const variant =
    p.variants.find((value) => value.id === selection.variante) ?? first;
  const sel = variant.options;
  const setShot = (index: number) =>
    void setSelection({ foto: index === 0 ? null : index + 1 });
  const [qty, setQty] = useState(1);
  const buy = useRef<HTMLDivElement>(null);
  const [barOn, setBarOn] = useState(false);

  const values = useMemo(
    () =>
      Object.fromEntries(
        p.options.map((o) => [
          o,
          [...new Set(p.variants.map((v) => v.options[o]).filter(Boolean))],
        ]),
      ),
    [p],
  );
  const matches = (v: PublicVariant, s: Record<string, string>) =>
    p.options.every((o) => v.options[o] === s[o]);
  const sellable = canSell(variant);

  /** Com este valor (e as outras escolhas), existe variante? E ela pode ser vendida? */
  const state = (o: string, val: string) => {
    const hit = p.variants.find((v) => matches(v, { ...sel, [o]: val }));
    return !hit ? "outra" : canSell(hit) ? "ok" : "esgotado";
  };
  const choose = (o: string, val: string) => {
    const want = { ...sel, [o]: val };
    // combinação inexistente: pega a variante mais próxima com o valor escolhido, de preferência vendável
    const hit =
      p.variants.find((v) => matches(v, want)) ??
      p.variants.find((v) => v.options[o] === val && canSell(v)) ??
      p.variants.find((v) => v.options[o] === val);
    if (hit)
      void setSelection(
        { variante: hit.id === first.id ? null : hit.id, foto: null },
        { history: "push" },
      );
  };

  // galeria: o que é da variante escolhida primeiro, depois o geral
  const gallery = useMemo(() => {
    const own = p.media.filter((m) => m.variantId === variant.id);
    const general = p.media.filter((m) => !m.variantId);
    return [...own, ...general];
  }, [p.media, variant.id]);
  const shot = Math.max(0, Math.min(selection.foto - 1, gallery.length - 1));
  const current = gallery[shot];
  const swipe = useRef<number | null>(null);
  const step = (d: number) =>
    gallery.length > 1 && setShot((shot + d + gallery.length) % gallery.length);

  const desc = variantLabel(variant, p.options);
  const price = variant.priceCents;
  const msg = [
    sellable
      ? `Olá! Tenho interesse nesta peça: ${p.title}${desc ? ` (${desc})` : ""}.`
      : `Olá! A peça ${p.title}${desc ? ` (${desc})` : ""} está esgotada no site. Quando volta?`,
    `SKU ${variant.sku}${price ? ` · ${brl(price)}` : ""}`,
    url,
  ].join("\n");
  const canBuy = sellable && price != null && price > 0;

  const addToBag = () => {
    if (!canBuy) return;
    const img =
      (
        p.media.find(
          (m) => m.variantId === variant.id && m.kind === "imagem",
        ) ?? p.media.find((m) => !m.variantId && m.kind === "imagem")
      )?.url ?? null;
    shop.add({
      variantId: variant.id,
      productId: p.id,
      slug: p.slug,
      title: p.title,
      label: desc,
      sku: variant.sku,
      image: img,
      category: p.category,
      priceCents: price,
      qty,
    });
    setQty(1);
  };

  // celular: quando o botão principal já passou para cima da tela, aparece uma barra fixa com preço e "Adicionar"
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const r = buy.current?.getBoundingClientRect();
      setBarOn(!!r && r.bottom < 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("pdp-bar-on", barOn);
    return () => document.documentElement.classList.remove("pdp-bar-on");
  }, [barOn]);

  return (
    <div className="pdp-grid">
      <div
        className="pdp-gal"
        tabIndex={gallery.length > 1 ? 0 : undefined}
        aria-label={
          gallery.length > 1
            ? "Galeria: use as setas do teclado para passar"
            : undefined
        }
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div
          className="stage"
          onPointerDown={(e) => (swipe.current = e.clientX)}
          onPointerUp={(e) => {
            const dx = e.clientX - (swipe.current ?? e.clientX);
            swipe.current = null;
            if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
          }}
        >
          {current ? (
            <Frame
              key={`${current.url}|${variant.id}`}
              m={current}
              title={p.title}
              lightOn={lightOnFor(gallery, current.url)}
            />
          ) : (
            <div className="frame art">
              <ProductArt category={p.category} className="pa" />
            </div>
          )}
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                className="gnav prev"
                aria-label="Anterior"
                onClick={() => step(-1)}
              >
                <ChevronLeft size={23} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="gnav next"
                aria-label="Próxima"
                onClick={() => step(1)}
              >
                <ChevronRight size={23} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <span className="gcount" aria-hidden="true">
                {Math.min(shot, gallery.length - 1) + 1} / {gallery.length}
              </span>
            </>
          )}
        </div>
        {gallery.length > 1 && (
          <div className="thumbs" role="tablist" aria-label="Fotos e vídeos">
            {gallery.map((m, i) => {
              const v = m.kind === "video" ? parseVideo(m.url) : null;
              const src = m.kind === "imagem" ? m.url : v?.thumb;
              return (
                <button
                  key={m.url}
                  role="tab"
                  aria-selected={i === shot}
                  className={`${i === shot ? "on" : ""}${v ? " vid" : ""}`}
                  onClick={() => setShot(i)}
                  aria-label={v ? `Vídeo ${i + 1}` : `Foto ${i + 1}`}
                >
                  {src ? (
                    <img
                      src={src}
                      alt=""
                      loading="lazy"
                      className={v?.vertical ? "tall" : undefined}
                    />
                  ) : (
                    <span />
                  )}
                  {v && <i className="pl lucide-play" aria-hidden="true"><Play size={13} fill="currentColor" strokeWidth={1.5} /></i>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="pdp-info">
        <span className="pcat">{label}</span>
        <h1>{name}</h1>
        <div className="pdp-price">
          {price ? (
            <>
              <b>{brl(price)}</b>
              {variant.compareAtCents && variant.compareAtCents > price && (
                <s>{brl(variant.compareAtCents)}</s>
              )}
            </>
          ) : (
            <b className="ask">Sob consulta</b>
          )}
        </div>
        {canBuy && installmentsFor(price) > 1 && (
          <p className="pdp-inst">
            ou {installmentsFor(price)}x de{" "}
            {brl(Math.ceil(price / installmentsFor(price)))} sem juros
          </p>
        )}
        <p
          className={`avail${variant.inStock ? " is-in" : sellable ? "" : " is-out"}`}
        >
          <i aria-hidden="true" />
          {availability(variant)}
        </p>

        {p.options.map((o) => (
          <fieldset className="opt" key={o}>
            <legend>
              {optionName(o)}
              <span>{sel[o]}</span>
            </legend>
            <div className={`vals${o === "acabamento" ? " fin" : ""}`}>
              {values[o].map((val) => {
                const c = o === "acabamento" ? swatch(val) : null;
                const on = sel[o] === val;
                const st = state(o, val);
                return (
                  <button
                    key={val}
                    type="button"
                    aria-pressed={on}
                    className={`${on ? "on" : ""}${st === "ok" ? "" : st === "esgotado" ? " out" : " na"}`}
                    onClick={() => choose(o, val)}
                    title={
                      st === "ok"
                        ? val
                        : st === "esgotado"
                          ? `${val} · esgotado`
                          : `${val} (em outra combinação)`
                    }
                  >
                    {c && <i style={{ background: c }} aria-hidden="true" />}
                    {val}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="pdp-buy" ref={buy}>
          {canBuy ? (
            <>
              <Qty value={qty} onChange={setQty} />
              <ParticleButton
                variant="default"
                autoWidth={false}
                successLabel="Na sacola"
                pendingLabel="Adicionando…"
                errorLabel="Tente novamente"
                type="button"
                className="sbtn amber grow"
                onClick={addToBag}
              >
                Adicionar à sacola
              </ParticleButton>
            </>
          ) : (
            <a
              className="sbtn amber grow"
              href={waNumberLink(whatsapp, msg)}
              target="_blank"
              rel="noopener"
            >
              {sellable
                ? "Pedir orçamento pelo WhatsApp"
                : "Avise-me quando chegar"}
            </a>
          )}
          <FavButton id={p.id} title={p.title} className="pdp-fav" />
        </div>
        {canBuy && (
          <p className="pdp-alt">
            Prefere conversar antes?{" "}
            <a
              className="tlink"
              href={waNumberLink(whatsapp, msg)}
              target="_blank"
              rel="noopener"
            >
              Comprar com uma consultora pelo WhatsApp
            </a>
          </p>
        )}

        {canBuy && <ShippingCalc variantId={variant.id} qty={qty} />}

        <ul className="pdp-perks">
          <li>Entrega grátis em Brasília e acima de R$ 3.000</li>
          <li>Pague com Pix ou cartão de crédito</li>
          <li>
            Quer a casa toda?{" "}
            <a className="tlink" href="/#contato">
              Inclua num projeto de iluminação
            </a>
          </li>
        </ul>
        <p className="sku">SKU {variant.sku}</p>
      </div>

      {canBuy && (
        <div
          className={`pdp-bar${barOn ? " on" : ""}`}
          aria-hidden={!barOn}
          inert={!barOn}
        >
          <div>
            <b>{name}</b>
            <span>
              {brl(price)}
              {desc ? ` · ${desc}` : ""}
            </span>
          </div>
          <ParticleButton
            type="button"
            successLabel="Na sacola"
            className="sbtn amber sm"
            onClick={addToBag}
          >
            Adicionar
          </ParticleButton>
        </div>
      )}
    </div>
  );
}

/**
 * Quadro principal. Vídeo começa sozinho, sem som e em loop, quando a pessoa chega nele na galeria
 * (o player só carrega quando o quadro aparece na tela); o som se liga no próprio player.
 */
function Frame({
  m,
  title,
  lightOn,
}: {
  m: ProductMedia;
  title: string;
  lightOn: string | null;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (m.kind !== "video" || !box.current) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setSeen(true),
      { threshold: 0.35 },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, [m.kind]);

  if (m.kind === "imagem")
    return (
      <div className={`frame${lightOn ? " has-light-pair" : ""}`}>
        <img src={m.url} alt={m.alt || title} />
        {lightOn && (
          <img
            className="product-light-on"
            src={lightOn}
            alt=""
            aria-hidden="true"
            loading="lazy"
          />
        )}
      </div>
    );
  const v = parseVideo(m.url);
  if (!v) return null;
  const src =
    v.provider === "youtube"
      ? `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&mute=1&loop=1&playlist=${v.id}&playsinline=1&rel=0&modestbranding=1`
      : v.provider === "vimeo"
        ? `https://player.vimeo.com/video/${v.id}?autoplay=1&muted=1&loop=1&title=0&byline=0`
        : v.src;
  return (
    <div className={`frame video${v.vertical ? " tall" : ""}`} ref={box}>
      {/* miniatura enquanto o player carrega */}
      {v.thumb && (
        <img
          src={v.thumb}
          alt=""
          className={`vposter${v.vertical ? " tall" : ""}`}
        />
      )}
      {seen &&
        (v.provider === "arquivo" ? (
          <video src={src} autoPlay muted loop playsInline controls />
        ) : (
          <iframe
            src={src}
            title={`Vídeo: ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ))}
    </div>
  );
}
