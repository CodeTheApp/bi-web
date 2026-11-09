"use client";
import { I } from "./icons";
import { useShop } from "./ShopProvider";

/** Coração de favoritar: no card (sobre a foto) e na página do produto. */
export function FavButton({ id, title, className = "", withText = false }: { id: string; title: string; className?: string; withText?: boolean }) {
  const s = useShop();
  const on = s.ready && s.isFav(id);
  return (
    <button
      type="button"
      className={`fav${on ? " on" : ""}${withText ? " txt" : ""} ${className}`}
      aria-pressed={on}
      aria-label={on ? `Tirar ${title} dos favoritos` : `Salvar ${title} nos favoritos`}
      title={on ? "Nos favoritos" : "Salvar nos favoritos"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        s.toggleFav(id);
      }}
    >
      <I n="heart" size={withText ? 18 : 19} filled={on} />
      {withText && <span>{on ? "Nos favoritos" : "Favoritar"}</span>}
    </button>
  );
}
