import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerContactUpdate } from "@/entities/order";
const state = vi.hoisted(() => ({
  mode: "empty",
  rpc: vi.fn(),
  authUpdate: vi.fn(),
  service: vi.fn(),
  writes: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/admin/repo", () => ({ demoAllowed: () => true }));
vi.mock("@/server/catalog/store", () => ({
  catalogStore: () => ({ products: [], moves: [] }),
}));
vi.mock("@/server/demo-workspace", () => ({
  getDemoDataMode: () => state.mode,
  demoWorkspaceKey: (namespace: string, mode: string) => `${namespace}:${mode}`,
}));
vi.mock("@/server/demo-file", () => ({
  readDemo: () => null,
  writeDemoSoon: (file: string) => state.writes.push(file),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: () => {} }) }));
vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServer: async () => ({
    rpc: state.rpc,
    auth: { admin: { updateUserById: state.authUpdate } },
  }),
  createSupabaseService: state.service,
}));
import { demoShop } from "@/server/shop/repo-demo";
import { supabaseShop } from "@/server/shop/repo-supabase";
beforeEach(() => {
  vi.clearAllMocks();
  state.mode = "empty";
  state.writes.length = 0;
  const memory = globalThis as {
    __biShop?: unknown;
    __biShopWorkspaces?: unknown;
    __biWorkspaceCodes?: unknown;
  };
  delete memory.__biShop;
  delete memory.__biShopWorkspaces;
  delete memory.__biWorkspaceCodes;
});
describe("customer repository updates", () => {
  it("demo changes only explicit CRM fields in the captured workspace, leaving order snapshots intact", async () => {
    const repo = demoShop();
    const customer = (
      await repo.google("/", "login@example.com", "Nome anterior")
    ).customer!;
    const order = await repo.createOrder({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
      phone: "",
      items: [],
      subtotalCents: 100,
      shippingCents: 0,
      totalCents: 100,
      shipping: {
        id: "retirada",
        label: "Retirada",
        days: "1 dia",
        priceCents: 0,
        address: null,
      },
      payment: null,
      status: "aguardando_pagamento",
      tracking: "",
      notes: "",
      timeline: [],
    });
    state.mode = "examples";
    const contact = {
      name: "Nome atualizado",
      phone: "61999999999",
      contactEmail: "contact@example.com",
      email: "forbidden@example.com",
      cpf: "forbidden",
    } as CustomerContactUpdate;
    const updated = await repo.updateCustomer(customer.id, contact);
    expect(updated).toMatchObject({
      name: contact.name,
      email: customer.email,
      contactEmail: contact.contactEmail,
      cpf: customer.cpf,
      id: customer.id,
      provider: customer.provider,
    });
    expect(await repo.getOrder(order.id)).toEqual(order);
    expect(await demoShop().customer(customer.id)).toBeNull();
    expect(
      state.writes.every((file) => file === "demo-workspace-shop-empty.json"),
    ).toBe(true);
  });
  it("Supabase sends only permitted fields to the guarded contact RPC and never calls Auth", async () => {
    state.rpc.mockResolvedValue({
      data: {
        id: "customer-id",
        name: "Ana",
        email: "login@example.com",
        contact_email: "contact@example.com",
        phone: "61999999999",
        cpf: "",
        provider: "email",
        created_at: "2026-11-12T12:00:00Z",
      },
      error: null,
    });
    const repo = await supabaseShop();
    const updated = await repo.updateCustomer("customer-id", {
      name: "Ana",
      contactEmail: "contact@example.com",
      phone: "61999999999",
      email: "forbidden@example.com",
    } as CustomerContactUpdate);
    expect(state.rpc).toHaveBeenCalledWith("update_customer_contact", {
      p_customer: "customer-id",
      p_name: "Ana",
      p_phone: "61999999999",
      p_contact_email: "contact@example.com",
    });
    expect(updated.email).toBe("login@example.com");
    expect(updated.contactEmail).toBe("contact@example.com");
    expect(state.authUpdate).not.toHaveBeenCalled();
    expect(state.service).not.toHaveBeenCalled();
  });
});
