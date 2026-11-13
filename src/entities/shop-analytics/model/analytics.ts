import type { Order } from "@/entities/order";
import type { AnalyticsOrder, AnalyticsPeriod, DateRange, MethodFilter, Movement, SeriesPoint } from "./types";

const dateParts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
export function brazilDay(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = dateParts.formatToParts(date);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const shiftDay = (day: string, offset: number) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

export function dateRange(period: AnalyticsPeriod, from = "", to = "", now = new Date()): DateRange {
  const today = brazilDay(now);
  if (period === "tudo") return { from: null, to: null };
  if (period === "personalizado") {
    if (!validDay(from) || !validDay(to)) return { from: null, to: null, error: "Informe as duas datas do período." };
    if (from > to) return { from, to, error: "A data inicial precisa vir antes da data final." };
    return { from, to };
  }
  const first = period === "mes" ? `${today.slice(0, 7)}-01` : period === "ano" ? `${today.slice(0, 4)}-01-01` : shiftDay(today, -(Number.parseInt(period, 10) - 1));
  return { from: first, to: today };
}

export function inRange(iso: string | null, range: DateRange) {
  if (range.error) return false;
  if (!range.from && !range.to) return true;
  if (!iso) return false;
  const day = brazilDay(iso);
  return Boolean(day) && (!range.from || day >= range.from) && (!range.to || day <= range.to);
}
export const methodMatches = (order: Pick<AnalyticsOrder, "method">, method: MethodFilter) => method === "todos" || (method === "manual" ? !order.method : order.method === method);
export const methodLabel = (method: AnalyticsOrder["method"]) => method === "pix" ? "Pix" : method === "cartao" ? "Cartão" : "Sem método registrado";
export const paidOrder = (order: AnalyticsOrder) => order.status !== "cancelado" && order.status !== "aguardando_pagamento" && order.paymentStatus !== "estornado";

/** Payment dates come from the payment or audit timeline, never inferred from order creation. */
export function analyticsOrder(order: Order): AnalyticsOrder {
  const paymentEvents = order.timeline.filter((event) => event.status === "pago");
  const paidAt = order.payment?.paidAt || paymentEvents[0]?.at || null;
  const refunded = order.payment?.status === "estornado";
  return {
    id: order.id, number: order.number, customerName: order.name, createdAt: order.createdAt, status: order.status,
    subtotalCents: order.subtotalCents, shippingCents: order.shippingCents, totalCents: order.totalCents,
    method: order.payment?.method ?? null, paymentStatus: order.payment?.status ?? null,
    paidAt,
    refundedAt: refunded ? [...order.timeline].reverse().find((event) => event.status === "cancelado")?.at ?? null : null,
    wasPaid: Boolean(paidAt || refunded || order.payment?.status === "aprovado" || !["aguardando_pagamento", "cancelado"].includes(order.status)),
    items: order.items.map(({ productId, title, category, sku, qty, priceCents }) => ({ productId, title, category, sku, qty, priceCents })),
  };
}

export function orderMovements(orders: AnalyticsOrder[]): Movement[] {
  const movements: Movement[] = [];
  for (const order of orders) {
    const base = { orderId: order.id, number: order.number, customerName: order.customerName, amountCents: order.totalCents, method: order.method };
    if (order.wasPaid) movements.push({ ...base, id: `${order.id}:recebido`, kind: "recebido", at: order.paidAt });
    if (order.paymentStatus === "estornado") movements.push({ ...base, id: `${order.id}:estorno`, kind: "estorno", at: order.refundedAt });
    if (order.status === "aguardando_pagamento") movements.push({ ...base, id: `${order.id}:aguardando`, kind: "aguardando", at: order.createdAt });
  }
  return movements.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "") || b.number - a.number);
}

export function financialSummary(orders: AnalyticsOrder[], range: DateRange, method: MethodFilter = "todos") {
  const all = orderMovements(orders.filter((order) => methodMatches(order, method)));
  const movements = all.filter((movement) => inRange(movement.at, range));
  const sum = (kind: Movement["kind"]) => movements.filter((movement) => movement.kind === kind).reduce((total, movement) => total + movement.amountCents, 0);
  const receivedCents = sum("recebido"), refundedCents = sum("estorno"), pendingCents = sum("aguardando");
  const methods = ["pix", "cartao", null].map((paymentMethod) => ({
    method: paymentMethod as AnalyticsOrder["method"],
    receivedCents: movements.filter((movement) => movement.method === paymentMethod && movement.kind === "recebido").reduce((total, movement) => total + movement.amountCents, 0),
    refundedCents: movements.filter((movement) => movement.method === paymentMethod && movement.kind === "estorno").reduce((total, movement) => total + movement.amountCents, 0),
  }));
  const series = new Map<string, SeriesPoint>();
  for (const movement of movements) {
    if (!movement.at || movement.kind === "aguardando") continue;
    const day = brazilDay(movement.at);
    const point = series.get(day) ?? { day, receivedCents: 0, refundedCents: 0, orders: 0 };
    if (movement.kind === "recebido") { point.receivedCents += movement.amountCents; point.orders++; }
    else point.refundedCents += movement.amountCents;
    series.set(day, point);
  }
  return { movements, receivedCents, refundedCents, pendingCents, balanceCents: receivedCents - refundedCents, methods, series: [...series.values()].sort((a, b) => a.day.localeCompare(b.day)), undated: all.filter((movement) => !movement.at).length };
}

export function salesSummary(orders: AnalyticsOrder[], range: DateRange, method: MethodFilter = "todos", status = "todos") {
  const cohort = orders.filter((order) => inRange(order.createdAt, range) && methodMatches(order, method) && (status === "todos" || order.status === status));
  const paid = cohort.filter(paidOrder);
  const totalCents = paid.reduce((total, order) => total + order.totalCents, 0);
  const products = new Map<string, { id: string; title: string; category: string; quantity: number; revenueCents: number; orders: number }>();
  const categories = new Map<string, { category: string; quantity: number; revenueCents: number }>();
  for (const order of paid) {
    const counted = new Set<string>();
    for (const item of order.items) {
      const id = item.productId || item.sku;
      const product = products.get(id) ?? { id, title: item.title, category: item.category, quantity: 0, revenueCents: 0, orders: 0 };
      product.quantity += item.qty;
      product.revenueCents += item.qty * item.priceCents;
      if (!counted.has(id)) product.orders++;
      counted.add(id);
      products.set(id, product);
      const category = categories.get(item.category) ?? { category: item.category, quantity: 0, revenueCents: 0 };
      category.quantity += item.qty;
      category.revenueCents += item.qty * item.priceCents;
      categories.set(item.category, category);
    }
  }
  const byStatus = new Map<string, number>();
  cohort.forEach((order) => byStatus.set(order.status, (byStatus.get(order.status) ?? 0) + 1));
  return {
    orders: cohort, paidOrders: paid.length, totalCents,
    shippingCents: paid.reduce((total, order) => total + order.shippingCents, 0),
    quantity: paid.reduce((total, order) => total + order.items.reduce((count, item) => count + item.qty, 0), 0),
    averageCents: paid.length ? Math.round(totalCents / paid.length) : 0,
    cancelled: cohort.filter((order) => order.status === "cancelado").length,
    cancellationRate: cohort.length ? cohort.filter((order) => order.status === "cancelado").length / cohort.length : 0,
    products: [...products.values()].sort((a, b) => b.revenueCents - a.revenueCents || b.quantity - a.quantity),
    categories: [...categories.values()].sort((a, b) => b.revenueCents - a.revenueCents),
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
  };
}
