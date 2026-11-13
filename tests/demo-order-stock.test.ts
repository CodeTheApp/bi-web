import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/entities/order";
const state = vi.hoisted(() => ({
  order: null as Order | null,
  mode: "demo",
  sell: vi.fn(),
  log: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn() }));
vi.mock("@/server/admin/guard", () => ({
  ctx: async () => ({ me: { name: "Admin" }, repo: { log: state.log } }),
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
vi.mock("@/server/catalog/public", () => ({
  CATALOG_TAG: "catalog",
  getCatalog: vi.fn(),
}));
vi.mock("@/server/catalog/repo", () => ({
  getCatalogRepo: async () => ({ sell: state.sell }),
}));
vi.mock("@/server/shop/payments", () => ({
  paymentProvider: () => ({ simulated: true }),
}));
vi.mock("@/server/shop/repo", () => ({
  getShopRepo: async () => ({
    mode: state.mode,
    getOrder: async () => state.order,
    myOrder: async () => state.order,
    updateOrder: async (
      _id: string,
      patch: Partial<Order>,
      event?: Order["timeline"][number],
    ) => {
      Object.assign(state.order!, patch);
      if (event) state.order!.timeline.push(event);
      return state.order;
    },
  }),
}));
import { setOrderStatus } from "@/server/shop/admin-actions";
import { simulatePixPaid } from "@/server/shop/actions";
import { buildDemoCatalogFixtures } from "@/server/catalog/demo-fixtures";
import { buildDemoCommerceFixtures } from "@/server/shop/demo-fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  state.mode = "demo";
  state.order = buildDemoCommerceFixtures(
    buildDemoCatalogFixtures().products,
  ).orders.find((order) => order.status === "aguardando_pagamento")!;
});

describe("example orders never change genuine stock", () => {
  it("admin payment and cancellation only update the example's history", async () => {
    expect((await setOrderStatus(state.order!.id, "pago")).ok).toBe(true);
    expect((await setOrderStatus(state.order!.id, "cancelado")).ok).toBe(true);
    expect(state.order!.payment!.status).toBe("estornado");
    expect(state.sell).not.toHaveBeenCalled();
    expect((await setOrderStatus(state.order!.id, "cancelado")).ok).toBe(false);
    expect(state.sell).not.toHaveBeenCalled();
  });
  it("simulating a fixture Pix payment also skips stock", async () => {
    expect((await simulatePixPaid(state.order!.id)).ok).toBe(true);
    expect(state.order!.status).toBe("pago");
    expect(state.sell).not.toHaveBeenCalled();
  });
  it("genuine demo orders still use stock normally", async () => {
    state.order!.id = "genuine-order";
    expect((await setOrderStatus(state.order!.id, "pago")).ok).toBe(true);
    expect(state.sell).toHaveBeenCalledOnce();
  });
  it("the fixture marker never bypasses stock in Supabase", async () => {
    state.mode = "supabase";
    expect((await setOrderStatus(state.order!.id, "pago")).ok).toBe(true);
    expect(state.sell).toHaveBeenCalledOnce();
  });
});
