import { canSell, variantLabel, type PublicProduct } from "@/entities/product";
import type { CartItem } from "@/entities/order";

export type CardPurchase =
  { kind: "add"; item: CartItem } | { kind: "options" | "consult" };

const hasPrice = (price: number | null): price is number =>
  price !== null && Number.isSafeInteger(price) && price > 0;

/** Quick add must never silently choose a finish, size or version. */
export function cardPurchase(product: PublicProduct): CardPurchase {
  const priced = product.variants.filter(
    (variant) => canSell(variant) && hasPrice(variant.priceCents),
  );
  if (!priced.length) return { kind: "consult" };
  if (product.variants.length !== 1) return { kind: "options" };
  const variant = priced[0];
  const image =
    product.media.find(
      (media) =>
        media.visible &&
        media.kind === "imagem" &&
        media.variantId === variant.id,
    ) ??
    product.media.find(
      (media) => media.visible && media.kind === "imagem" && !media.variantId,
    );
  return {
    kind: "add",
    item: {
      productId: product.id,
      variantId: variant.id,
      title: product.title,
      slug: product.slug,
      sku: variant.sku,
      category: product.category,
      label: variantLabel(variant, product.options),
      image: image?.url ?? null,
      priceCents: variant.priceCents,
      qty: 1,
    },
  };
}
