"use client";
import { useEffect, useState } from "react";
import { brl, type CategorySlug } from "@/lib/catalog/types";
import { FREE_FROM } from "@/lib/shop/shipping";
import { quoteCart } from "@/server/shop/actions";
import { ProductArt } from "../loja/ProductArt";
import { I } from "./icons";
import { Layer } from "./Layer";
import { Qty } from "./Qty";
import { useShop } from "./ShopProvider";

type Quote = Extract<Awaited<ReturnType<typeof quoteCart>>, { ok: true }>["data"];
export type QuoteLine = Quote["lines"][number];

/** Gaveta da sacola: confere preço e disponibilidade no servidor sempre que abre ou muda. */
export function CartDrawer() {
  const shop = useShop();
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    if (!shop.cartOpen || !shop.items.length) return;
    let alive = true;
    const t = setTimeout(() => {
      quoteCart(shop.items.map((i) => ({ variantId: i.variantId, qty: i.qty }))).then((r) => alive && r.ok && setQuote(r.data));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [shop.cartOpen, shop.items]);

  const byId = new Map(quote?.lines.map((l) => [l.variantId, l]));
  const fresh = quote && shop.items.every((i) => byId.get(i.variantId)?.qty === i.qty || byId.get(i.variantId)?.available === false);
  const subtotal = fresh ? quote.subtotal : shop.subtotal;
  const blocked = shop.items.some((i) => byId.get(i.variantId)?.available === false);
  const missing = Math.max(0, FREE_FROM - subtotal);

  return (
    <Layer open={shop.cartOpen} onClose={shop.closeCart} label="Sacola" className="cart">
      <header className="cart-head">
        <h2>Sacola</h2>
        {shop.count > 0 && <span>{shop.count === 1 ? "1 peça" : `${shop.count} peças`}</span>}
      </header>

      {shop.items.length === 0 ? (
        <div className="cart-empty">
          <span className="cart-glow" aria-hidden="true">
            <I n="bag" size={30} />
          </span>
          <p className="t">Sua sacola está vazia</p>
          <p className="muted">Escolha uma peça e o acabamento; ela fica guardada aqui até você finalizar.</p>
          <a className="sbtn amber" href="/loja" onClick={shop.closeCart}>
            Ver a loja
          </a>
          {shop.favorites.length > 0 && (
            <a className="tlink" href="/loja/favoritos" onClick={shop.closeCart}>
              Ver meus favoritos ({shop.favorites.length})
            </a>
          )}
        </div>
      ) : (
        <>
          <ul className="cart-lines">
            {shop.items.map((i) => {
              const q = byId.get(i.variantId);
              const price = q?.priceCents ?? i.priceCents;
              const out = q?.available === false;
              return (
                <li key={i.variantId} className={`cl${shop.flash === i.variantId ? " glow" : ""}${out ? " out" : ""}`}>
                  <a className="cl-img" href={`/loja/${i.slug}`} onClick={shop.closeCart} tabIndex={-1} aria-hidden="true">
                    {i.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" />
                    ) : (
                      <ProductArt category={i.category as CategorySlug} className="pa" />
                    )}
                  </a>
                  <div className="cl-info">
                    <a className="cl-title" href={`/loja/${i.slug}`} onClick={shop.closeCart}>
                      {i.title}
                    </a>
                    {i.label && <span className="cl-var">{i.label}</span>}
                    {out ? (
                      <span className="cl-warn">{q?.reason}. Tire da sacola para finalizar.</span>
                    ) : q?.stockPolicy === "encomenda" && !q.inStock ? (
                      <span className="cl-note">
                        Sob encomenda
                        {q.leadTimeDays ? ` · ${q.leadTimeDays} dias` : ""}
                      </span>
                    ) : null}
                    <div className="cl-row">
                      {!out && <Qty size="sm" value={i.qty} onChange={(n) => shop.setQty(i.variantId, n)} label={`Quantidade de ${i.title}`} />}
                      <span className="cl-price">{price ? brl(price * i.qty) : "Sob consulta"}</span>
                    </div>
                  </div>
                  <button type="button" className="cl-x" onClick={() => shop.remove(i.variantId)} aria-label={`Tirar ${i.title} da sacola`}>
                    <I n="trash" size={17} />
                  </button>
                </li>
              );
            })}
          </ul>
          <footer className="cart-foot">
            <div className="ship-meter" aria-label={missing ? `Faltam ${brl(missing)} para entrega grátis` : "Entrega grátis"}>
              <p>
                {missing ? (
                  <>
                    Faltam <b>{brl(missing)}</b> para entrega grátis em todo o Brasil
                  </>
                ) : (
                  <>
                    <I n="truck" size={16} /> Entrega padrão grátis
                  </>
                )}
              </p>
              <i
                style={{
                  ["--p" as string]: `${Math.min(100, (subtotal / FREE_FROM) * 100)}%`,
                }}
              />
            </div>
            <div className="cart-sum">
              <span>Subtotal</span>
              <b>{brl(subtotal)}</b>
            </div>
            <p className="cart-note">Frete e prazo no próximo passo. Em Brasília a entrega é grátis.</p>
            {blocked ? (
              <span className="sbtn amber wide is-off" aria-disabled="true">
                Finalizar compra
              </span>
            ) : (
              <a className="sbtn amber wide" href="/loja/checkout" onClick={shop.closeCart}>
                Finalizar compra
              </a>
            )}
            <button type="button" className="tlink center" onClick={shop.closeCart}>
              Continuar comprando
            </button>
          </footer>
        </>
      )}
    </Layer>
  );
}
