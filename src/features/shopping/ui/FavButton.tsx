"use client";
import ParticleButton from "@/shared/ui/kokonutui/particle-button";
import { I } from "@/features/shopping/ui/icons";
import { useShop } from "@/features/shopping/model/ShopProvider";

/** Coração de favoritar: no card (sobre a foto) e na página do produto. */
export function FavButton({
  id,
  title,
  className = "",
  withText = false,
}: {
  id: string;
  title: string;
  className?: string;
  withText?: boolean;
}) {
  const s = useShop();
  const on = s.ready && s.isFav(id);
  return (
    <ParticleButton
      variant="ghost"
      size={withText ? "default" : "icon"}
      autoWidth={withText}
      statusIcons={false}
      successDuration={500}
      successLabel={
        <>
          <I n="heart" size={withText ? 18 : 19} filled={on} />
          {withText && <span>{on ? "Salvo" : "Removido"}</span>}
        </>
      }
      pendingLabel="Salvando…"
      errorLabel="Tente novamente"
      type="button"
      className={`fav${on ? " on" : ""}${withText ? " txt" : ""} ${className}`}
      aria-pressed={on}
      aria-label={
        on ? `Tirar ${title} dos favoritos` : `Salvar ${title} nos favoritos`
      }
      title={on ? "Nos favoritos" : "Salvar nos favoritos"}
      onClick={(e) => {
        e.stopPropagation();
        s.toggleFav(id);
      }}
    >
      <I n="heart" size={withText ? 18 : 19} filled={on} />
      {withText && <span>{on ? "Nos favoritos" : "Favoritar"}</span>}
    </ParticleButton>
  );
}
