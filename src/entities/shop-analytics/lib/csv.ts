import type { AnalyticsOrder, Movement } from "../model/types";
import { methodLabel } from "../model/analytics";

/** Quoted semicolon CSV, UTF-8 BOM, and formula neutralization for spreadsheet imports. */
export function csvCell(value: string | number) {
  const text = String(value);
  // A signed decimal is a literal, while -SUM(...), +cmd and leading tabs can be formulas.
  const decimal = /^-\d+(?:,\d+)?$/.test(text);
  const safe = /^[\s]*[=+@-]/.test(text) && typeof value === "string" && !decimal ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export const csv = (rows: Array<Array<string | number>>) => `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
const cents = (value: number) => (value / 100).toFixed(2).replace(".", ",");
const date = (value: string | null) => value ? new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Sem data registrada";
export function movementsCsv(movements: Movement[]) {
  const labels = { recebido: "Pagamento aprovado", estorno: "Estorno registrado", aguardando: "Aguardando pagamento" };
  return csv([["Pedido", "Cliente", "Movimento", "Data (Brasília)", "Pagamento", "Valor (R$)"], ...movements.map((movement) => [movement.number, movement.customerName, labels[movement.kind], date(movement.at), methodLabel(movement.method), cents(movement.kind === "estorno" ? -movement.amountCents : movement.amountCents)])]);
}
export function ordersCsv(orders: AnalyticsOrder[]) {
  return csv([["Pedido", "Cliente", "Criado em (Brasília)", "Situação", "Pagamento", "Produtos (R$)", "Frete (R$)", "Total (R$)"], ...orders.map((order) => [order.number, order.customerName, date(order.createdAt), order.status, methodLabel(order.method), cents(order.subtotalCents), cents(order.shippingCents), cents(order.totalCents)])]);
}
export function productsCsv(products: Array<{ title: string; category: string; quantity: number; orders: number; revenueCents: number }>) {
  return csv([["Produto", "Categoria", "Peças", "Pedidos pagos", "Valor dos itens antes dos descontos (R$)"], ...products.map((product) => [product.title, product.category, product.quantity, product.orders, cents(product.revenueCents)])]);
}
export function downloadCsv(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
