import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  couponDiscount,
  couponDraftSchema,
  type Coupon,
} from "@/entities/coupon/model/coupon";
import type { Order } from "@/entities/order";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/server/demo-file", () => ({
  readDemo: () => null,
  writeDemoSoon: () => {},
}));
vi.mock("@/server/demo-workspace", () => ({
  getDemoDataMode: () => "empty",
  demoWorkspaceKey: (namespace: string, mode: string) => `${namespace}:${mode}`,
}));
import { demoShop } from "@/server/shop/repo-demo";

const now = Date.parse("2026-11-12T15:00:00Z");
const base: Coupon = {
  id: "coupon",
  code: "LUZ10",
  kind: "percentual",
  value: 10,
  minimumCents: 1000,
  startsAt: null,
  expiresAt: null,
  active: true,
  maxUses: null,
  used: 0,
  createdAt: new Date(now).toISOString(),
};
const input = (coupon: Coupon): Omit<Order, "id" | "number" | "createdAt"> => ({
  customerId: "customer",
  email: "cliente@example.com",
  name: "Cliente",
  phone: "",
  items: [],
  subtotalCents: 12345,
  shippingCents: 1900,
  totalCents: 14245,
  coupon: couponDiscount(coupon, 12345),
  discountCents: couponDiscount(coupon, 12345).discountCents,
  shipping: {
    id: "padrao",
    label: "Padrão",
    days: "3 dias",
    priceCents: 1900,
    address: null,
  },
  payment: null,
  status: "aguardando_pagamento",
  tracking: "",
  notes: "",
  timeline: [],
});

describe("coupon rules", () => {
  it("canonicalizes codes and rejects invalid percentage/date ranges", () => {
    expect(couponDraftSchema.parse({ ...base, code: " luz-10 " }).code).toBe(
      "LUZ-10",
    );
    expect(couponDraftSchema.safeParse({ ...base, value: 101 }).success).toBe(
      false,
    );
    expect(
      couponDraftSchema.safeParse({
        ...base,
        startsAt: "2026-12-01T00:00:00Z",
        expiresAt: "2026-11-01T00:00:00Z",
      }).success,
    ).toBe(false);
  });
  it("rounds percentage cents down and never discounts freight", () => {
    expect(couponDiscount(base, 12345, now).discountCents).toBe(1234);
    expect(
      couponDiscount({ ...base, kind: "fixo", value: 20000 }, 12345, now)
        .discountCents,
    ).toBe(12345);
  });
  it("enforces dates, active state, minimum and usage capacity", () => {
    expect(() =>
      couponDiscount({ ...base, active: false }, 12345, now),
    ).toThrow("desativado");
    expect(() =>
      couponDiscount(
        { ...base, startsAt: new Date(now + 1).toISOString() },
        12345,
        now,
      ),
    ).toThrow("ainda não");
    expect(() =>
      couponDiscount(
        { ...base, expiresAt: new Date(now).toISOString() },
        12345,
        now,
      ),
    ).toThrow("expirou");
    expect(() => couponDiscount(base, 999, now)).toThrow("pelo menos");
    expect(() =>
      couponDiscount({ ...base, used: 1, maxUses: 1 }, 12345, now),
    ).toThrow("limite");
    expect(() => couponDiscount(base, Number.NaN, now)).toThrow(
      "Subtotal inválido",
    );
  });
});

describe("coupon checkout transaction", () => {
  beforeEach(() => {
    delete (globalThis as { __biShop?: unknown }).__biShop;
    delete (globalThis as { __biShopWorkspaces?: unknown }).__biShopWorkspaces;
    delete (globalThis as { __biWorkspaceCodes?: unknown }).__biWorkspaceCodes;
  });
  it("keeps the empty workspace free of example promotions", async () => {
    expect(await demoShop().coupons()).toEqual([]);
  });
  it("recalculates the discount and ignores client-supplied totals", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, base);
    const result = await repo.createCheckout(
      { ...input(coupon), totalCents: 1 },
      "checkout-a",
      coupon.code,
    );
    expect(result.order.discountCents).toBe(1234);
    expect(result.order.totalCents).toBe(13011);
    expect(result.order.coupon).toMatchObject({
      code: "LUZ10",
      discountCents: 1234,
    });
  });
  it("creates one order for two concurrent submissions with the same key", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, { ...base, maxUses: 1 });
    const attempts = await Promise.all([
      repo.createCheckout(input(coupon), "same", coupon.code),
      repo.createCheckout(input(coupon), "same", coupon.code),
    ]);
    expect(attempts.map((attempt) => attempt.created)).toEqual([true, false]);
    expect(attempts[0].order.id).toBe(attempts[1].order.id);
    expect((await repo.coupons())[0].used).toBe(1);
    expect(await repo.allOrders()).toHaveLength(1);
  });
  it("the final coupon use cannot be overspent by concurrent orders", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, { ...base, maxUses: 1 });
    const attempts = await Promise.allSettled([
      repo.createCheckout(input(coupon), "first", coupon.code),
      repo.createCheckout(input(coupon), "second", coupon.code),
    ]);
    expect(
      attempts.filter((attempt) => attempt.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      attempts.filter((attempt) => attempt.status === "rejected"),
    ).toHaveLength(1);
    expect(await repo.allOrders()).toHaveLength(1);
    expect((await repo.coupons())[0].used).toBe(1);
  });
  it("invalid checkout leaves neither an order nor a consumed use", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, {
      ...base,
      minimumCents: 20000,
    });
    await expect(
      repo.createCheckout(
        { ...input({ ...coupon, minimumCents: 0 }), subtotalCents: 12345 },
        "invalid",
        coupon.code,
      ),
    ).rejects.toThrow("pelo menos");
    expect(await repo.allOrders()).toHaveLength(0);
    expect((await repo.coupons())[0].used).toBe(0);
  });
  it("cancelling an order releases capacity while preserving its coupon snapshot", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, { ...base, maxUses: 1 });
    const first = await repo.createCheckout(
      input(coupon),
      "first",
      coupon.code,
    );
    await repo.updateOrder(first.order.id, { status: "cancelado" });
    const second = await repo.createCheckout(
      input(coupon),
      "second",
      coupon.code,
    );
    expect(second.created).toBe(true);
    expect((await repo.getOrder(first.order.id))?.coupon?.code).toBe(
      coupon.code,
    );
    expect((await repo.coupons())[0].used).toBe(1);
  });
  it("requires a new confirmation when a coupon changes after the quote", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, base);
    const quoted = input(coupon);
    await repo.saveCoupon(coupon.id, { ...coupon, value: 20 });
    await expect(
      repo.createCheckout(quoted, "race", coupon.code),
    ).rejects.toThrow("cupom mudou");
    expect(await repo.allOrders()).toHaveLength(0);
  });
  it("does not delete or rename coupons referenced by an order", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, base);
    await repo.createCheckout(input(coupon), "first", coupon.code);
    await expect(repo.deleteCoupon(coupon.id)).rejects.toThrow("histórico");
    await expect(
      repo.saveCoupon(coupon.id, { ...coupon, code: "OUTRO" }),
    ).rejects.toThrow("mantêm seu código");
  });
  it("keeps old orders and coupon registry when the module reloads", async () => {
    const repo = demoShop();
    const coupon = await repo.saveCoupon(null, base);
    await repo.createCheckout(input(coupon), "persist", coupon.code);
    const nextRepo = demoShop();
    expect(await nextRepo.coupons()).toHaveLength(1);
    expect(
      (await nextRepo.findCheckout("persist", "customer"))?.coupon?.code,
    ).toBe("LUZ10");
  });
});
