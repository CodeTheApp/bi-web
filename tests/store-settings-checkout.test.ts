import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_STORE_PREFERENCES,
  type StorePreferences,
} from "@/entities/store-settings";

const mock = vi.hoisted(() => ({
  content: vi.fn(),
  catalog: vi.fn(),
  shop: vi.fn(),
  charge: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/server/content", () => ({ getContent: mock.content }));
vi.mock("@/server/catalog/public", () => ({
  getCatalog: mock.catalog,
  CATALOG_TAG: "catalog",
}));
vi.mock("@/server/catalog/repo", () => ({ getCatalogRepo: vi.fn() }));
vi.mock("@/server/shop/repo", () => ({ getShopRepo: mock.shop }));
vi.mock("@/server/shop/payments", () => ({
  paymentProvider: () => ({ create: mock.charge }),
}));
vi.mock("@/server/admin/guard", () => ({
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
import { placeOrder, shippingOptions } from "@/server/shop/actions";

let preferences: StorePreferences;
let snapshot: Record<string, unknown>;
const repo = {
  me: vi.fn(),
  couponByCode: vi.fn(),
  findCheckout: vi.fn(),
  createCheckout: vi.fn(),
  updateOrder: vi.fn(),
  saveAddress: vi.fn(),
};
const address = {
  id: "existing-address",
  recipient: "Pessoa",
  cep: "01310-100",
  street: "Rua de teste",
  number: "100",
  complement: "",
  district: "Centro",
  city: "São Paulo",
  uf: "SP",
};
const draft = {
  items: [{ variantId: "variant", qty: 1 }],
  checkoutKey: "5262b2d3-538e-4bc7-9da9-7f1cc6202b3e",
  couponCode: "",
  expectedTotalCents: 100000,
  address: null,
  shippingId: "retirada",
  method: "pix",
  notes: "",
};
beforeEach(() => {
  vi.clearAllMocks();
  preferences = { ...DEFAULT_STORE_PREFERENCES };
  mock.content.mockImplementation(async () => ({
    settings: { store: preferences },
  }));
  mock.shop.mockResolvedValue(repo);
  repo.me.mockResolvedValue({
    id: "customer",
    name: "Pessoa",
    email: "pessoa@example.test",
    phone: "",
  });
  repo.findCheckout.mockResolvedValue(null);
  repo.couponByCode.mockResolvedValue({
    id: "coupon",
    code: "LUZ25",
    kind: "percentual",
    value: 25,
    minimumCents: 0,
    active: true,
    startsAt: null,
    expiresAt: null,
    maxUses: null,
    used: 0,
    createdAt: new Date().toISOString(),
  });
  mock.catalog.mockResolvedValue([
    {
      id: "product",
      title: "Pendente",
      slug: "pendente",
      category: "pendentes",
      media: [],
      options: [],
      variants: [
        {
          id: "variant",
          sku: "SKU",
          priceCents: 100000,
          inStock: true,
          stockPolicy: "estoque",
          options: {},
        },
      ],
    },
  ]);
  repo.createCheckout.mockImplementation(async (input) => {
    snapshot = { ...input, id: "order", number: 1001 };
    return { created: true, order: snapshot };
  });
  repo.updateOrder.mockImplementation(async (_id, patch) => ({
    ...snapshot,
    ...patch,
  }));
  mock.charge.mockResolvedValue({
    provider: "simulado",
    method: "pix",
    status: "pendente",
    chargeId: "charge",
  });
});

describe("trusted store preferences in checkout", () => {
  it("uses persisted method availability and ignores browser-supplied preference overrides", async () => {
    preferences.pickupEnabled = false;
    expect(
      await placeOrder({ ...draft, store: { pickupEnabled: true } }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("forma de entrega"),
    });
    expect(repo.createCheckout).not.toHaveBeenCalled();
    expect(mock.charge).not.toHaveBeenCalled();
    preferences.expressEnabled = false;
    expect(
      await placeOrder({ ...draft, address, shippingId: "expressa" }),
    ).toMatchObject({ ok: false });
    preferences.deliveryEnabled = false;
    preferences.pickupEnabled = true;
    expect(
      await placeOrder({ ...draft, address, shippingId: "padrao" }),
    ).toMatchObject({ ok: false });
  });

  it("quotes and charges shipping after the coupon using the same configured threshold", async () => {
    preferences.freeShippingFromCents = 80000;
    const options = await shippingOptions(address.cep, draft.items, "LUZ25");
    expect(options).toMatchObject({
      ok: true,
      data: expect.arrayContaining([
        expect.objectContaining({ id: "padrao", priceCents: 7900 }),
      ]),
    });
    const result = await placeOrder({
      ...draft,
      couponCode: "LUZ25",
      address,
      shippingId: "padrao",
      expectedTotalCents: 82900,
    });
    expect(result.ok).toBe(true);
    expect(repo.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotalCents: 100000,
        discountCents: 25000,
        shippingCents: 7900,
        totalCents: 82900,
      }),
      draft.checkoutKey,
      "LUZ25",
    );
    expect(mock.charge).toHaveBeenCalledWith(
      expect.objectContaining({ totalCents: 82900 }),
      "pix",
      undefined,
    );
  });

  it("stores pickup details as an immutable shipping snapshot, including pickup without an address", async () => {
    preferences.pickupReadyDays = 4;
    preferences.pickupAddress = "Loja de teste, Brasília / DF";
    expect((await placeOrder(draft)).ok).toBe(true);
    expect(snapshot.shipping).toMatchObject({
      id: "retirada",
      address: null,
      days: "Pronto em 4 dias úteis",
      pickupAddress: "Loja de teste, Brasília / DF",
    });
    preferences.pickupAddress = "Outro endereço";
    expect(snapshot.shipping).toHaveProperty(
      "pickupAddress",
      "Loja de teste, Brasília / DF",
    );
  });

  it("requires a fresh confirmation when a persisted freight setting changes the total", async () => {
    preferences.freeShippingFromCents = null;
    expect(
      await placeOrder({
        ...draft,
        address,
        shippingId: "padrao",
        expectedTotalCents: 100000,
      }),
    ).toMatchObject({
      ok: false,
      error: expect.stringContaining("total mudou"),
    });
    expect(repo.createCheckout).not.toHaveBeenCalled();
    expect(mock.charge).not.toHaveBeenCalled();
  });
});
