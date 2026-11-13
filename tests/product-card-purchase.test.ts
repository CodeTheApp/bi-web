import { describe, expect, it } from "vitest";
import type { PublicProduct, PublicVariant } from "@/entities/product";
import { cardPurchase } from "@/features/shopping/model/card-purchase";

const variant: PublicVariant = {
  id: "variant",
  sku: "SKU-1",
  options: { acabamento: "Bronze" },
  priceCents: 12500,
  compareAtCents: null,
  stockPolicy: "estoque",
  inStock: true,
  leadTimeDays: null,
};
const product: PublicProduct = {
  id: "product",
  slug: "abajur",
  title: "Abajur",
  category: "abajures",
  description: "",
  specs: {},
  options: ["acabamento"],
  variants: [variant],
  media: [
    {
      url: "/hidden.webp",
      kind: "imagem",
      variantId: variant.id,
      visible: false,
      alt: "",
    },
    {
      url: "/global.webp",
      kind: "imagem",
      variantId: null,
      visible: true,
      alt: "",
    },
    {
      url: "/bronze.webp",
      kind: "imagem",
      variantId: variant.id,
      visible: true,
      alt: "",
    },
  ],
};

describe("catalog purchase eligibility", () => {
  it("adds a single priced variant with qty one and that variant's visible image", () => {
    expect(cardPurchase(product)).toEqual({
      kind: "add",
      item: {
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        slug: product.slug,
        sku: variant.sku,
        category: product.category,
        label: "Bronze",
        image: "/bronze.webp",
        priceCents: 12500,
        qty: 1,
      },
    });
  });
  it("requires explicit options even if only one of several finishes is currently sellable", () => {
    expect(
      cardPurchase({
        ...product,
        variants: [
          variant,
          {
            ...variant,
            id: "other",
            options: { acabamento: "Preto" },
            inStock: false,
          },
        ],
      }),
    ).toEqual({ kind: "options" });
  });
  it("does not silently choose between equally priced available options", () => {
    expect(
      cardPurchase({
        ...product,
        variants: [variant, { ...variant, id: "other" }],
      }),
    ).toEqual({ kind: "options" });
  });
  it.each([null, 0, -1, 12.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "sends an unknown/invalid price (%s) to consultation",
    (priceCents) => {
      expect(
        cardPurchase({ ...product, variants: [{ ...variant, priceCents }] }),
      ).toEqual({ kind: "consult" });
    },
  );
  it("never adds unavailable stock but allows a priced made-to-order variant", () => {
    expect(
      cardPurchase({ ...product, variants: [{ ...variant, inStock: false }] }),
    ).toEqual({ kind: "consult" });
    expect(
      cardPurchase({
        ...product,
        variants: [{ ...variant, inStock: false, stockPolicy: "encomenda" }],
      }).kind,
    ).toBe("add");
  });
});
