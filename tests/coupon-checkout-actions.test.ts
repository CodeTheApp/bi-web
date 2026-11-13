import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/entities/order";

const mocks = vi.hoisted(() => ({
  getShop: vi.fn(),
  getCatalog: vi.fn(),
  createPayment: vi.fn(),
  ctx: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/server/admin/guard", () => ({
  ctx: mocks.ctx,
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
vi.mock("@/server/catalog/public", () => ({
  getCatalog: mocks.getCatalog,
  CATALOG_TAG: "catalog",
}));
vi.mock("@/server/catalog/repo", () => ({ getCatalogRepo: vi.fn() }));
vi.mock("@/server/shop/repo", () => ({ getShopRepo: mocks.getShop }));
vi.mock("@/server/shop/payments", () => ({
  paymentProvider: () => ({ create: mocks.createPayment }),
}));
import { placeOrder, quoteCart } from "@/server/shop/actions";
import { getCoupons } from "@/entities/coupon/api/actions";

const draft = {
  items: [{ variantId: "variant", qty: 1 }],
  checkoutKey: "5262b2d3-538e-4bc7-9da9-7f1cc6202b3e",
  couponCode: "LUZ10",
  expectedTotalCents: 9000,
  address: null,
  shippingId: "retirada",
  method: "pix",
  notes: "",
};
const coupon = {
  id: "coupon",
  code: "LUZ10",
  kind: "percentual",
  value: 10,
  minimumCents: 0,
  active: true,
  startsAt: null,
  expiresAt: null,
  maxUses: 10,
  used: 0,
  createdAt: "2026-11-12T12:00:00Z",
};
const customer = {
  id: "customer",
  name: "Pessoa",
  email: "pessoa@example.com",
  phone: "61999999999",
};
let order: Order;
const shop = {
  me: vi.fn(),
  couponByCode: vi.fn(),
  findCheckout: vi.fn(),
  createCheckout: vi.fn(),
  updateOrder: vi.fn(),
  coupons: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getShop.mockResolvedValue(shop);
  mocks.ctx.mockResolvedValue({});
  shop.me.mockResolvedValue(customer);
  shop.couponByCode.mockResolvedValue(coupon);
  shop.findCheckout.mockResolvedValue(null);
  mocks.getCatalog.mockResolvedValue([
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
          priceCents: 10000,
          inStock: true,
          stockPolicy: "estoque",
          options: {},
        },
      ],
    },
  ]);
  shop.createCheckout.mockImplementation(async (value) => {
    order = {
      ...value,
      id: "order",
      number: 1001,
      createdAt: "2026-11-12T12:00:00Z",
    };
    return { order, created: true };
  });
  shop.updateOrder.mockImplementation(async (_id, patch) => ({
    ...order,
    ...patch,
  }));
  mocks.createPayment.mockResolvedValue({
    provider: "simulado",
    method: "pix",
    status: "pendente",
    chargeId: "payment",
  });
});

describe("trusted coupon checkout", () => {
  it("ignores a browser discount and prices the real coupon/catalogue on the server", async () => {
    const result = await placeOrder({
      ...draft,
      discountCents: 9999,
      coupon: { discountCents: 9999 },
    });
    expect(result.ok).toBe(true);
    expect(shop.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotalCents: 10000,
        discountCents: 1000,
        totalCents: 9000,
        coupon: expect.objectContaining({
          id: "coupon",
          code: "LUZ10",
          discountCents: 1000,
        }),
      }),
      draft.checkoutKey,
      "LUZ10",
    );
    expect(mocks.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ totalCents: 9000 }),
      "pix",
      undefined,
    );
  });
  it("requires the shopper to confirm a changed price before any order/payment", async () => {
    const result = await placeOrder({ ...draft, expectedTotalCents: 1 });
    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("total mudou"),
    });
    expect(shop.createCheckout).not.toHaveBeenCalled();
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });
  it("never charges a duplicate checkout key", async () => {
    shop.findCheckout.mockResolvedValueOnce({
      id: "existing",
      number: 1000,
      status: "aguardando_pagamento",
      payment: null,
    });
    expect(await placeOrder(draft)).toMatchObject({
      ok: true,
      data: { id: "existing" },
    });
    expect(mocks.getCatalog).not.toHaveBeenCalled();
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });
  it("also stops charging when the atomic insert detects a racing duplicate", async () => {
    shop.createCheckout.mockResolvedValueOnce({
      created: false,
      order: {
        id: "racing",
        number: 1001,
        status: "aguardando_pagamento",
        payment: null,
      },
    });
    expect(await placeOrder(draft)).toMatchObject({
      ok: true,
      data: { id: "racing" },
    });
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });
  it("does not charge if reserving the last coupon use fails", async () => {
    shop.createCheckout.mockRejectedValueOnce(
      new Error("Este cupom atingiu o limite de usos."),
    );
    expect(await placeOrder(draft)).toMatchObject({
      ok: false,
      error: expect.stringContaining("limite"),
    });
    expect(mocks.createPayment).not.toHaveBeenCalled();
  });
  it("requires a real customer before pricing or reserving coupons", async () => {
    shop.me.mockResolvedValueOnce(null);
    expect(await placeOrder(draft)).toMatchObject({
      ok: false,
      error: expect.stringContaining("Entre"),
    });
    expect(mocks.getCatalog).not.toHaveBeenCalled();
    expect(shop.createCheckout).not.toHaveBeenCalled();
  });
  it("explains an invalid code in the quote without losing the cart lines", async () => {
    const result = await quoteCart(draft.items, "!!!");
    expect(result).toMatchObject({
      ok: true,
      data: {
        subtotal: 10000,
        discountCents: 0,
        coupon: null,
        couponError: expect.stringContaining("letras"),
      },
    });
  });
});

describe("coupon administration authorization", () => {
  it("checks staff authorization before reading promotions", async () => {
    mocks.ctx.mockRejectedValueOnce(new Error("Sessão expirada"));
    expect(await getCoupons()).toEqual({ ok: false, error: "Sessão expirada" });
    expect(mocks.getShop).not.toHaveBeenCalled();
  });
});
