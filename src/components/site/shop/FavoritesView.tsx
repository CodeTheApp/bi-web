"use client";
import { useEffect, useState } from "react";
import type { PublicProduct } from "@/lib/catalog/types";
import { favoriteProducts } from "@/server/shop/actions";
import { ProductCard } from "../loja/ProductCard";
import { useShop } from "./ShopProvider";

/** Favoritos: da conta (logado) ou deste navegador. Tirar o coração tira a peça da lista na hora. */
export function FavoritesView() {
  const shop = useShop();
  const [list, setList] = useState<PublicProduct[] | null>(null);
  const ids = shop.favorites.join(",");

  useEffect(() => {
    if (!shop.ready) return;
    let alive = true;
    favoriteProducts(ids ? ids.split(",") : []).then((r) => alive && setList(r.ok ? r.data : []));
    return () => {
      alive = false;
    };
    // só busca de novo quando entra uma peça nova; tirar só esconde
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.ready, shop.loaded, shop.customer?.id]);

  const shown = list?.filter((p) => shop.favorites.includes(p.id)) ?? null;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="pcat">Loja</span>
          <h1>Favoritos</h1>
          <p>
            {shop.customer ? "Guardados na sua conta: aparecem em qualquer aparelho em que você entrar." : "Guardados neste navegador. Entre na sua conta para não perder e ver em outros aparelhos."}
          </p>
        </div>
        {!shop.customer && shop.loaded && (
          <button
            type="button"
            className="sbtn line sm"
            onClick={() => shop.openLogin({ title: "Guardar favoritos", reason: "Entre para levar estes favoritos para a sua conta e ver em qualquer aparelho." })}
          >
            Entrar
          </button>
        )}
      </div>
      {shown == null ? (
        <div className="shop-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skel" style={{ aspectRatio: "4/5.9" }} />
          ))}
        </div>
      ) : shown.length ? (
        <div className="shop-grid">
          {shown.map((p, i) => (
            <ProductCard key={p.id} p={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="page-empty">
          <p className="t">Nenhum favorito ainda</p>
          <p>Toque no coração das peças que você gostar: elas ficam aqui para comparar e decidir com calma.</p>
          <a className="sbtn amber" href="/loja">
            Ver a loja
          </a>
        </div>
      )}
    </>
  );
}
