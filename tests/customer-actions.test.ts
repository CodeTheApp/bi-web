import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Customer } from "@/entities/order";
const state = vi.hoisted(() => ({
  ctx: vi.fn(),
  shop: vi.fn(),
  customer: vi.fn(),
  orders: vi.fn(),
  update: vi.fn(),
  log: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/shop/repo", () => ({ getShopRepo: state.shop }));
vi.mock("@/server/admin/guard", () => ({
  ctx: state.ctx,
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
import {
  getCustomerAdmin,
  getCustomerOrdersAdmin,
  updateCustomerContact,
} from "@/server/shop/customer-actions";
const customer: Customer = {
  id: "customer-id",
  name: "Ana",
  email: "login@example.com",
  phone: "",
  cpf: "private-cpf",
  addresses: [],
  provider: "email",
  createdAt: "2026-11-12T12:00:00Z",
};
const draft = {
  name: "Ana Atualizada",
  phone: "61999999999",
  contactEmail: "contact@example.com",
};
beforeEach(() => {
  vi.clearAllMocks();
  state.ctx.mockResolvedValue({
    me: { id: "staff" },
    repo: { log: state.log },
  });
  state.shop.mockResolvedValue({
    customer: state.customer,
    customerOrders: state.orders,
    updateCustomer: state.update,
  });
  state.customer.mockResolvedValue(customer);
  state.orders.mockResolvedValue([]);
  state.update.mockResolvedValue({ ...customer, ...draft });
});
describe("staff customer management", () => {
  it("authenticates before reading customer, orders or saving contact", async () => {
    state.ctx.mockRejectedValue(new Error("Sessão expirada"));
    expect((await getCustomerAdmin(customer.id)).ok).toBe(false);
    expect((await getCustomerOrdersAdmin(customer.id)).ok).toBe(false);
    expect((await updateCustomerContact(customer.id, draft)).ok).toBe(false);
    expect(state.shop).not.toHaveBeenCalled();
  });
  it("returns only CRM details and preserves the protected login identity", async () => {
    expect(await getCustomerAdmin(customer.id)).toEqual({
      ok: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        contactEmail: "",
        phone: "",
        provider: "email",
        createdAt: customer.createdAt,
      },
    });
    const updated = await updateCustomerContact(customer.id, draft);
    expect(updated).toMatchObject({
      ok: true,
      data: { email: customer.email, contactEmail: draft.contactEmail },
    });
    expect(state.update).toHaveBeenCalledWith(customer.id, draft);
  });
  it("does not accept a browser request to overwrite authentication/profile-private fields", async () => {
    expect(
      (
        await updateCustomerContact(customer.id, {
          ...draft,
          email: "changed-login@example.com",
        })
      ).ok,
    ).toBe(false);
    expect(
      (await updateCustomerContact(customer.id, { ...draft, cpf: "changed" }))
        .ok,
    ).toBe(false);
    expect(state.update).not.toHaveBeenCalled();
  });
  it("loads orders only for the requested existing customer", async () => {
    expect(await getCustomerOrdersAdmin(customer.id)).toEqual({
      ok: true,
      data: [],
    });
    expect(state.orders).toHaveBeenCalledWith(customer.id);
    state.customer.mockResolvedValue(null);
    state.orders.mockClear();
    expect((await getCustomerOrdersAdmin("missing")).ok).toBe(false);
    expect(state.orders).not.toHaveBeenCalled();
  });
});
