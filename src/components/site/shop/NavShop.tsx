"use client";
import { useEffect, useRef, useState } from "react";
import { I } from "./icons";
import { useShop } from "./ShopProvider";

/** Favoritos, conta e sacola no menu. A sacola fica visível também no celular, ao lado do menu. */
export function NavShop() {
  const s = useShop();
  const favs = s.ready ? s.favorites.length : 0;
  const count = s.ready ? s.count : 0;
  // o número da sacola pulsa quando aumenta
  const last = useRef(count);
  const [bump, setBump] = useState(0);
  useEffect(() => {
    if (count > last.current) setBump((b) => b + 1);
    last.current = count;
  }, [count]);
  const initial = s.customer ? (s.customer.name || s.customer.email).trim().charAt(0).toUpperCase() : "";

  return (
    <div className="nav-shop">
      <a className="nicon wide-only" href="/loja/favoritos" aria-label={favs ? `Favoritos, ${favs}` : "Favoritos"} title="Favoritos">
        <I n="heart" />
        {favs > 0 && <b>{favs}</b>}
      </a>
      {s.customer ? (
        <a className="nicon wide-only me" href="/conta" aria-label="Minha conta" title="Minha conta">
          <span>{initial}</span>
        </a>
      ) : (
        <button type="button" className="nicon wide-only" onClick={() => s.openLogin()} aria-label="Entrar" title="Entrar">
          <I n="user" />
        </button>
      )}
      <button type="button" className="nicon bag" onClick={s.openCart} aria-label={count ? `Sacola, ${count} ${count === 1 ? "peça" : "peças"}` : "Sacola"} title="Sacola">
        <I n="bag" />
        {count > 0 && (
          <b key={bump} className={bump ? "bump" : undefined}>
            {count}
          </b>
        )}
      </button>
    </div>
  );
}

/** Atalhos da loja dentro do menu do celular. */
export function MobileShopLinks({ onNavigate }: { onNavigate: () => void }) {
  const s = useShop();
  return (
    <div className="mshop">
      <a href="/conta" onClick={onNavigate}>
        <I n="user" size={18} /> {s.customer ? "Minha conta" : "Entrar"}
      </a>
      <a href="/loja/favoritos" onClick={onNavigate}>
        <I n="heart" size={18} /> Favoritos
        {s.ready && s.favorites.length ? ` (${s.favorites.length})` : ""}
      </a>
    </div>
  );
}
