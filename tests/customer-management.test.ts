import { describe, expect, it } from "vitest";
import { createLoader, createSerializer } from "nuqs/server";
import type { OrderSummary } from "@/entities/order";
import {
  customerContactSchema,
  customerMetrics,
  customerWhatsApp,
} from "@/features/manage-customers/model/customer-contact";
import { customerListParsers } from "@/features/manage-customers";

describe("CRM contact rules", () => {
  it("normalizes editable contact fields while rejecting login/auth fields", () => {
    const input = {
      name: "  Ana Ribeiro  ",
      phone: "(61) 99999-9999",
      contactEmail: " CONTATO@EXAMPLE.COM ",
    };
    expect(customerContactSchema.parse(input)).toEqual({
      name: "Ana Ribeiro",
      phone: input.phone,
      contactEmail: "contato@example.com",
    });
    expect(
      customerContactSchema.safeParse({
        ...input,
        email: "new-login@example.com",
      }).success,
    ).toBe(false);
    expect(
      customerContactSchema.safeParse({ ...input, provider: "google" }).success,
    ).toBe(false);
    expect(
      customerContactSchema.parse({ ...input, contactEmail: "   ", phone: "" })
        .contactEmail,
    ).toBe("");
  });
  it("rejects incomplete phone numbers and invalid contact emails", () => {
    expect(
      customerContactSchema.safeParse({
        name: "Ana",
        phone: "9999",
        contactEmail: "",
      }).success,
    ).toBe(false);
    expect(
      customerContactSchema.safeParse({
        name: "Ana",
        phone: "",
        contactEmail: "not-an-email",
      }).success,
    ).toBe(false);
  });
  it("builds WhatsApp links for national numbers without changing explicit foreign country codes", () => {
    expect(customerWhatsApp("(61) 99999-9999")).toBe(
      "https://wa.me/5561999999999",
    );
    expect(customerWhatsApp("+1 555 123 4567")).toBe(
      "https://wa.me/15551234567",
    );
    expect(customerWhatsApp("+55 61 99999-9999")).toBe(
      "https://wa.me/5561999999999",
    );
    expect(customerWhatsApp("")).toBeNull();
  });
});
describe("customer purchasing summary", () => {
  it("uses net paid order totals, excluding pending and cancelled purchases", () => {
    const orders = [
      {
        id: "a",
        status: "pago",
        totalCents: 90000,
        createdAt: "2026-11-01T12:00:00Z",
      },
      {
        id: "b",
        status: "entregue",
        totalCents: 110000,
        createdAt: "2026-11-05T12:00:00Z",
      },
      {
        id: "c",
        status: "cancelado",
        totalCents: 500000,
        createdAt: "2026-11-06T12:00:00Z",
      },
      {
        id: "d",
        status: "aguardando_pagamento",
        totalCents: 400000,
        createdAt: "2026-11-08T12:00:00Z",
      },
    ] as OrderSummary[];
    expect(customerMetrics(orders)).toMatchObject({
      count: 4,
      paidCount: 2,
      totalCents: 200000,
      averageCents: 100000,
      lastOrder: { id: "d" },
    });
    expect(customerMetrics([])).toEqual({
      count: 0,
      paidCount: 0,
      totalCents: 0,
      averageCents: 0,
      lastOrder: null,
    });
  });
});
describe("customer drawer deep link", () => {
  it("opens and closes selection without dropping filters, page or sorting", () => {
    const serialize = createSerializer(customerListParsers);
    const original = "/admin/loja/clientes?q=Ana&page=2&sort=spentCents:desc";
    const opened = serialize(original, { cliente: "customer-id" });
    expect(
      createLoader(customerListParsers)(
        new URL(opened, "https://example.test"),
      ),
    ).toMatchObject({
      q: "Ana",
      page: 2,
      sort: [{ id: "spentCents", desc: true }],
      cliente: "customer-id",
    });
    expect(serialize(opened, { cliente: null })).toBe(original);
  });
});
