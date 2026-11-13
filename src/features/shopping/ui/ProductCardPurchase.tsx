"use client";

import Link from "next/link";
import { ArrowRight } from "@/shared/ui/icons/lucide";
import ParticleButton from "@/shared/ui/kokonutui/particle-button";
import { useShop } from "../model/ShopProvider";
import type { CardPurchase } from "../model/card-purchase";
import "./ProductCardPurchase.css";

export function ProductCardPurchase({
  purchase,
  title,
  slug,
}: {
  purchase: CardPurchase;
  title: string;
  slug: string;
}) {
  const shop = useShop();
  if (purchase.kind !== "add") {
    const label =
      purchase.kind === "options" ? "Escolher opções" : "Consultar peça";
    return (
      <div className="pcard-purchase">
        <Link
          className="pcard-purchase-action pcard-purchase-secondary"
          href={`/loja/${slug}`}
          aria-label={`${label}: ${title}`}
        >
          {label}
          <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </div>
    );
  }
  const existing = shop.items.find(
    (item) => item.variantId === purchase.item.variantId,
  );
  const limit = existing ? existing.qty >= 99 : shop.items.length >= 60;
  return (
    <div className="pcard-purchase">
      <ParticleButton
        autoWidth={false}
        className="pcard-purchase-action pcard-purchase-primary"
        disabled={!shop.ready || limit}
        aria-label={
          limit
            ? `Limite da sacola atingido para ${title}`
            : `Adicionar ${title} à sacola`
        }
        pendingLabel="Adicionando…"
        successLabel="Adicionado"
        errorLabel="Tente novamente"
        onClick={() => shop.add(purchase.item)}
      >
        {limit ? "Limite da sacola" : "Adicionar à sacola"}
      </ParticleButton>
    </div>
  );
}
