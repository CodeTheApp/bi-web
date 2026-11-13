"use client";
import { analyticsPath } from "./analytics-path";

export type SiteEventName = "page_view" | "product_view" | "add_to_cart" | "favorite" | "checkout_started" | "purchase";
const KEY = "bi:analytics-session";
let fallbackSession: string | undefined;
function session() {
  try {
    const current = sessionStorage.getItem(KEY);
    if (current && /^[0-9a-f-]{36}$/i.test(current)) return current;
    const id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
    return id;
  } catch { return fallbackSession ??= crypto.randomUUID(); }
}

/** Anonymous first-party events: never sends query strings, customer data or payment details. */
export function trackSiteEvent(event: SiteEventName, detail: { productId?: string } = {}) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  try {
    const path = analyticsPath(location.pathname);
    if (!path) return;
    const productId = detail.productId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(detail.productId) ? detail.productId : undefined;
    const body = JSON.stringify({ id: crypto.randomUUID(), session: session(), event, path, productId });
    if (navigator.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true, credentials: "same-origin" }).catch(() => {});
  } catch { /* Analytics must never interrupt shopping. */ }
}
