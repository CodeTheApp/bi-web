import { createHash } from "node:crypto";
import type { SiteEvent } from "@/entities/site-analytics";
import type { Order } from "@/entities/order";
import { brazilDay } from "@/entities/shop-analytics/model";

export const ANALYTICS_FIXTURE_VERSION = 1;
type ProductRef = { id: string; slug: string };
type ProjectRef = { slug: string };
const uuid = (value: string) => {
  const hex = createHash("sha256").update(`bi-demo-analytics:${value}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

/** Synthetic, anonymous demo traffic. Called only by the in-memory demo adapter. */
export function createDemoAnalyticsEvents(products: ProductRef[], projects: ProjectRef[], orders: Order[], now = new Date()): SiteEvent[] {
  const events: SiteEvent[] = [];
  const today = brazilDay(now);
  const maxAt = now.getTime();
  const add = (sessionKey: string, step: string, event: SiteEvent["event"], path: string, at: number, productId?: string) => {
    events.push({ id: uuid(`${sessionKey}:${step}`), session: uuid(sessionKey), event, path, at: new Date(Math.min(maxAt, at)).toISOString(), ...(productId ? { productId } : {}) });
  };
  for (let age = 89; age >= 0; age--) {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - age);
    const day = date.toISOString().slice(0, 10);
    const start = Date.parse(`${day}T03:00:00Z`);
    const weekend = [0, 6].includes(date.getUTCDay());
    const sessions = 7 + age % 5 + (age < 30 ? 6 : 0) + (weekend ? 3 : 0);
    const available = age === 0 ? Math.max(0, maxAt - start) : 21 * 3600e3;
    for (let index = 0; index < sessions; index++) {
      const key = `${day}:${index}`;
      const at = start + Math.floor(available * (index + 1) / (sessions + 1));
      add(key, "home", "page_view", "/", at);
      if (index % 5 === 0 && projects.length) add(key, "project", "page_view", `/projetos/${projects[(age + index) % projects.length].slug}`, at + 30000);
      if (index % 4 === 0) continue;
      add(key, "shop", "page_view", "/loja", at + 45000);
      const product = products[(age + index) % Math.max(1, products.length)];
      if (!product) continue;
      const path = `/loja/${product.slug}`;
      add(key, "product-page", "page_view", path, at + 90000);
      add(key, "product", "product_view", path, at + 91000, product.id);
      if (index % 3 === 0) add(key, "favorite", "favorite", path, at + 110000, product.id);
      if (index % 2 === 0) add(key, "cart", "add_to_cart", path, at + 130000, product.id);
      if (index % 6 === 0) {
        add(key, "checkout-page", "page_view", "/loja/checkout", at + 180000);
        add(key, "checkout", "checkout_started", "/loja/checkout", at + 181000);
      }
    }
  }
  // Purchase events follow registered approvals, including later-refunded orders.
  for (const order of orders) {
    const paidAt = order.payment?.paidAt ?? order.timeline.find((event) => event.status === "pago")?.at;
    const at = paidAt ? Date.parse(paidAt) : NaN;
    if (!Number.isFinite(at) || at > maxAt || at < maxAt - 90 * 86400e3) continue;
    const key = `purchase:${order.id}`;
    const product = products.find((entry) => entry.id === order.items[0]?.productId);
    add(key, "shop", "page_view", "/loja", at - 12 * 60000);
    if (product) {
      add(key, "product-page", "page_view", `/loja/${product.slug}`, at - 10 * 60000);
      add(key, "product", "product_view", `/loja/${product.slug}`, at - 10 * 60000 + 1000, product.id);
      add(key, "cart", "add_to_cart", `/loja/${product.slug}`, at - 8 * 60000, product.id);
    }
    add(key, "checkout-page", "page_view", "/loja/checkout", at - 5 * 60000);
    add(key, "checkout", "checkout_started", "/loja/checkout", at - 5 * 60000 + 1000);
    add(key, "purchase", "purchase", "/loja/pedido", at);
  }
  return events.sort((a, b) => a.at.localeCompare(b.at));
}
