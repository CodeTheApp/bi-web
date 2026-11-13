import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ shop: {} as Record<string, unknown> }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/shopping/model/ShopProvider", () => ({
  useShop: () => state.shop,
}));
vi.mock("@/server/shop/actions", () => ({
  placeOrder: vi.fn(),
  quoteCart: vi.fn(),
  saveProfile: vi.fn(),
  shippingOptions: vi.fn(),
}));
vi.mock("@/features/shopping/ui/Layer", () => ({
  Layer: ({ children }: { children: ReactNode }) => h("div", null, children),
}));
import { Checkout } from "@/features/shopping/ui/Checkout";
import { CartDrawer } from "@/features/shopping/ui/CartDrawer";
import { DEFAULT_STORE_PREFERENCES } from "@/entities/store-settings";

beforeEach(() => {
  state.shop = {
    ready: true,
    loaded: true,
    demo: true,
    cartOpen: true,
    customer: {
      id: "customer",
      name: "Pessoa",
      phone: "61999999999",
      email: "pessoa@example.test",
      cpf: "",
      addresses: [],
    },
    count: 1,
    items: [
      {
        variantId: "variant",
        productId: "product",
        qty: 1,
        priceCents: 10000,
        title: "Pendente",
        category: "pendentes",
        image: null,
      },
    ],
    subtotal: 10000,
    couponCode: "",
    storePreferences: { ...DEFAULT_STORE_PREFERENCES },
    isFav: () => false,
  };
});

describe("effective store preferences in the public interface", () => {
  it("hides pickup when disabled and shows the configured checkout notice", () => {
    state.shop.storePreferences = {
      ...DEFAULT_STORE_PREFERENCES,
      pickupEnabled: false,
      checkoutNotice: "Atendimento de segunda a sexta.",
    };
    const html = renderToStaticMarkup(h(Checkout));
    expect(html).toContain("Receber no endereço");
    expect(html).not.toContain("Retirar em Brasília");
    expect(html).toContain("Atendimento de segunda a sexta.");
  });
  it("starts in pickup mode when delivery is disabled and displays its address and preparation deadline", () => {
    state.shop.storePreferences = {
      ...DEFAULT_STORE_PREFERENCES,
      deliveryEnabled: false,
      pickupReadyDays: 4,
      pickupAddress: "Local de teste, Brasília / DF",
    };
    const html = renderToStaticMarkup(h(Checkout));
    expect(html).not.toContain("Receber no endereço");
    expect(html).toContain("Retirada grátis em Brasília");
    expect(html).toContain("Pronto em 4 dias úteis");
    expect(html).toContain("Local de teste, Brasília / DF");
  });
  it("keeps the cart free-shipping meter consistent with the saved threshold and hides a disabled offer", () => {
    state.shop.storePreferences = {
      ...DEFAULT_STORE_PREFERENCES,
      freeShippingFromCents: 20000,
    };
    expect(renderToStaticMarkup(h(CartDrawer))).toContain("100,00");
    state.shop.storePreferences = {
      ...DEFAULT_STORE_PREFERENCES,
      freeShippingFromCents: null,
    };
    expect(renderToStaticMarkup(h(CartDrawer))).not.toContain(
      'class="ship-meter"',
    );
  });
});
