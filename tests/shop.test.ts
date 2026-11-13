import { describe, expect, it } from "vitest";
import { FREE_FROM, quoteShipping, regionOf } from "@/entities/order";
import { cartCount, cartSubtotal, formatCep, installmentsFor, orderSummary, type Order } from "@/entities/order";

describe("frete simulado", () => {
  it("em Brasília a entrega padrão é grátis e dá para retirar", () => {
    const o = quoteShipping("70040-010", 50000, 1);
    expect(o.map((x) => x.id)).toEqual(["retirada", "padrao", "expressa"]);
    expect(o.find((x) => x.id === "padrao")!.priceCents).toBe(0);
    expect(o.find((x) => x.id === "expressa")!.days).toBe("No próximo dia útil");
  });
  it("fora do DF cobra por região e por peça, sem retirada", () => {
    const one = quoteShipping("01310-100", 50000, 1);
    const two = quoteShipping("01310-100", 50000, 2);
    expect(one.some((x) => x.id === "retirada")).toBe(false);
    expect(regionOf("01310-100").name).toBe("Sudeste");
    expect(two[0].priceCents - one[0].priceCents).toBe(1500);
  });
  it("entrega padrão grátis a partir do valor mínimo, a expressa continua paga", () => {
    const o = quoteShipping("80010-000", FREE_FROM, 1);
    expect(o.find((x) => x.id === "padrao")!.priceCents).toBe(0);
    expect(o.find((x) => x.id === "expressa")!.priceCents).toBeGreaterThan(0);
  });
  it("CEP incompleto não cota", () => {
    expect(quoteShipping("7004", 1000, 1)).toEqual([]);
  });
});

describe("sacola e pedido", () => {
  it("conta peças e soma o subtotal", () => {
    const items = [
      { qty: 2, priceCents: 1000 },
      { qty: 1, priceCents: null },
    ];
    expect(cartCount(items)).toBe(3);
    expect(cartSubtotal(items)).toBe(2000);
  });
  it("parcelas: até 10x, parcela mínima de R$ 100", () => {
    expect(installmentsFor(5000)).toBe(1);
    expect(installmentsFor(36881)).toBe(3);
    expect(installmentsFor(500000)).toBe(10);
  });
  it("formata o CEP", () => {
    expect(formatCep("70040010")).toBe("70040-010");
    expect(formatCep("7004")).toBe("7004");
  });
  it("resumo do pedido", () => {
    const o = { id: "a", number: 1001, name: "Ana", email: "a@b.c", totalCents: 100, status: "pago", createdAt: "2026-11-09T12:00:00Z", items: [{ qty: 2 }, { qty: 1 }], payment: { method: "pix" } } as unknown as Order;
    expect(orderSummary(o)).toMatchObject({ number: 1001, items: 3, method: "pix" });
  });
});
