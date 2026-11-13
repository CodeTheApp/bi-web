import { describe, expect, it } from "vitest";
import type { Order } from "@/entities/order";
import { analyticsOrder, brazilDay, dateRange, financialSummary, inRange, salesSummary, validDay } from "@/entities/shop-analytics/model";
import { csv, csvCell, movementsCsv, ordersCsv } from "@/entities/shop-analytics/lib/csv";

// Isolated fixtures: analytics tests never seed or write storefront orders.
function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "fixture-1", number: 1, customerId: "customer-1", name: "Cliente de teste", email: "private@example.test", phone: "61999999999",
    items: [{ variantId: "variant-1", productId: "product-1", slug: "pendente", title: "Pendente", label: "Dourado", sku: "P-1", image: null, category: "pendentes", qty: 2, priceCents: 12000 }],
    subtotalCents: 24000, shippingCents: 2000, totalCents: 26000,
    shipping: { id: "entrega", label: "Entrega", days: "5", priceCents: 2000, address: { id: "address-1", recipient: "Pessoa", street: "Rua privada", number: "1", complement: "", district: "Centro", city: "Brasília", uf: "DF", cep: "70000000" } },
    payment: { provider: "fixture", method: "pix", status: "aprovado", chargeId: "secret-charge", paidAt: "2026-11-02T12:00:00Z", last4: "1234" },
    status: "pago", tracking: "private-tracking", notes: "private-note", createdAt: "2026-11-01T12:00:00Z",
    timeline: [{ status: "pago", at: "2026-11-02T12:00:00Z", note: "", by: "Equipe" }],
    ...overrides,
  };
}
const november = { from: "2026-11-01", to: "2026-11-30" };

describe("analytics calendar in Brasília", () => {
  it("uses local midnight independently of the machine timezone", () => {
    expect(brazilDay("2026-11-01T02:59:59Z")).toBe("2026-10-31");
    expect(brazilDay("2026-11-01T03:00:00Z")).toBe("2026-11-01");
    expect(inRange("2026-12-01T02:59:59Z", november)).toBe(true);
    expect(inRange("2026-12-01T03:00:00Z", november)).toBe(false);
    expect(brazilDay("invalid")).toBe("");
  });

  it("computes inclusive presets and leap-year calendar ranges", () => {
    const now = new Date("2024-03-01T02:30:00Z"); // Feb 29 in Brasília.
    expect(dateRange("mes", "", "", now)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
    expect(dateRange("7d", "", "", now)).toEqual({ from: "2024-02-23", to: "2024-02-29" });
    expect(dateRange("30d", "", "", now)).toEqual({ from: "2024-01-31", to: "2024-02-29" });
    expect(dateRange("ano", "", "", now)).toEqual({ from: "2024-01-01", to: "2024-02-29" });
    expect(dateRange("tudo", "", "", now)).toEqual({ from: null, to: null });
  });

  it("rejects malformed, impossible or reversed custom dates without including all records", () => {
    expect(validDay("2024-02-29")).toBe(true);
    for (const day of ["2025-02-29", "2026-13-01", "2026-11-31", "2026-1-1", ""]) expect(validDay(day)).toBe(false);
    expect(dateRange("personalizado", "2026-11-30", "2026-11-01").error).toBeTruthy();
    expect(dateRange("personalizado", "2026-11-01", "2026-11-30")).toEqual(november);
    expect(inRange("2026-11-02T12:00:00Z", dateRange("personalizado", "", ""))).toBe(false);
  });
});

describe("financial movements", () => {
  it("books approval and refunds in their own date ranges rather than the order creation", () => {
    const refunded = analyticsOrder(order({
      createdAt: "2026-10-20T12:00:00Z", status: "cancelado",
      payment: { provider: "fixture", method: "cartao", status: "estornado", chargeId: "private", paidAt: "2026-10-22T12:00:00Z" },
      timeline: [{ status: "pago", at: "2026-10-22T12:00:00Z", note: "", by: "Equipe" }, { status: "cancelado", at: "2026-11-03T12:00:00Z", note: "", by: "Equipe" }],
    }));
    const october = financialSummary([refunded], { from: "2026-10-01", to: "2026-10-31" });
    expect(october.receivedCents).toBe(26000);
    expect(october.refundedCents).toBe(0);
    const report = financialSummary([refunded], november);
    expect(report.receivedCents).toBe(0);
    expect(report.refundedCents).toBe(26000);
    expect(report.balanceCents).toBe(-26000);
    expect(report.series).toEqual([{ day: "2026-11-03", receivedCents: 0, refundedCents: 26000, orders: 0 }]);
    const historical = financialSummary([refunded], dateRange("tudo"));
    expect(historical.balanceCents).toBe(0);
    expect(historical.methods.find((method) => method.method === "cartao")?.receivedCents).toBe(26000);
  });

  it("counts pending creation dates and never invents a refund for cancellation alone", () => {
    const pending = analyticsOrder(order({ id: "pending", status: "aguardando_pagamento", payment: null, timeline: [] }));
    const cancelled = analyticsOrder(order({ id: "cancelled", status: "cancelado", payment: null, timeline: [] }));
    const paidCancelled = analyticsOrder(order({ id: "paid-cancelled", status: "cancelado" }));
    const report = financialSummary([pending, cancelled, paidCancelled], november);
    expect(report.pendingCents).toBe(26000);
    expect(report.receivedCents).toBe(26000);
    expect(report.refundedCents).toBe(0);
    expect(report.movements).toHaveLength(2);
    expect(financialSummary([pending, paidCancelled], november, "manual").pendingCents).toBe(26000);
    expect(financialSummary([pending, paidCancelled], november, "pix").pendingCents).toBe(0);
  });

  it("keeps legacy undated approvals out of dated reports instead of assigning a fake payment date", () => {
    const snapshot = analyticsOrder(order({ payment: null, timeline: [], status: "entregue" }));
    expect(snapshot.wasPaid).toBe(true);
    expect(snapshot.paidAt).toBeNull();
    expect(financialSummary([snapshot], november)).toMatchObject({ receivedCents: 0, undated: 1 });
    expect(financialSummary([snapshot], dateRange("tudo"))).toMatchObject({ receivedCents: 26000, undated: 1, series: [] });
  });

  it("falls back to the approval timeline while stripping private payment and shipping details", () => {
    const snapshot = analyticsOrder(order({ payment: null }));
    expect(snapshot.paidAt).toBe("2026-11-02T12:00:00Z");
    expect(snapshot.customerName).toBe("Cliente de teste");
    const serialized = JSON.stringify(snapshot);
    for (const privateValue of ["private@example.test", "61999999999", "Rua privada", "private-note", "secret-charge", "1234", "private-tracking"]) expect(serialized).not.toContain(privateValue);
    expect(snapshot).not.toHaveProperty("email");
    expect(snapshot).not.toHaveProperty("payment");
    expect(snapshot).not.toHaveProperty("shipping");
  });
});

describe("sales reports", () => {
  it("uses creation cohorts, excludes cancelled/pending sales, and counts repeated variants once per order", () => {
    const first = order();
    first.items.push({ ...first.items[0], variantId: "variant-2", sku: "P-2", qty: 1, priceCents: 10000 });
    first.subtotalCents = 34000; first.totalCents = 36000;
    const snapshots = [first, order({ id: "cancelled", status: "cancelado" }), order({ id: "pending", status: "aguardando_pagamento", payment: null, timeline: [] }), order({ id: "old", createdAt: "2026-10-31T23:00:00Z" })].map(analyticsOrder);
    const report = salesSummary(snapshots, november);
    expect(report).toMatchObject({ totalCents: 36000, paidOrders: 1, quantity: 3, averageCents: 36000, shippingCents: 2000, cancelled: 1, cancellationRate: 1 / 3 });
    expect(report.orders).toHaveLength(3);
    expect(report.products).toEqual([{ id: "product-1", title: "Pendente", category: "pendentes", quantity: 3, revenueCents: 34000, orders: 1 }]);
    expect(report.categories).toEqual([{ category: "pendentes", quantity: 3, revenueCents: 34000 }]);
    expect(salesSummary(snapshots, november, "pix", "cancelado")).toMatchObject({ paidOrders: 0, cancelled: 1, cancellationRate: 1 });
  });

  it("returns actual zero values and no invented rankings when there are no orders", () => {
    expect(salesSummary([], november)).toMatchObject({ orders: [], paidOrders: 0, totalCents: 0, quantity: 0, averageCents: 0, cancellationRate: 0, products: [], categories: [], byStatus: [] });
    expect(financialSummary([], november)).toMatchObject({ movements: [], receivedCents: 0, refundedCents: 0, pendingCents: 0, balanceCents: 0, series: [] });
  });
});

describe("spreadsheet-safe Brazilian CSV", () => {
  it("quotes separators/newlines and neutralizes spreadsheet expressions, including leading whitespace", () => {
    expect(csvCell('Peça; "dourada"\nlinha')).toBe('"Peça; ""dourada""\nlinha"');
    for (const expression of ["=HYPERLINK(1)", "+SUM(1)", "@SUM(1)", "-SUM(1)", "\t=1+1", "\r\n+cmd", "-1+1"]) expect(csvCell(expression)).toBe(`"'${expression}"`);
    expect(csvCell(-12)).toBe('"-12"');
    expect(csv([["Olá", 2]])).toBe('\uFEFF"Olá";"2"');
  });

  it("exports refunds as signed comma decimals and Brasília dates", () => {
    const contents = movementsCsv([{ id: "1", orderId: "order-1", number: 1, customerName: "=1+1", kind: "estorno", amountCents: 12345, method: "pix", at: "2026-11-01T02:30:00Z" }]);
    expect(contents).toContain('"-123,45"');
    expect(contents).toContain("31/10/2026");
    expect(contents).toContain('"\'=1+1"');
    expect(contents).toContain("Estorno registrado");
    expect(ordersCsv([analyticsOrder(order())])).toContain('"240,00";"20,00";"260,00"');
  });
});
