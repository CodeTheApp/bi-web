import { z } from "zod";
import { analyticsPath } from "@/shared/lib/analytics-path";

export const SITE_EVENTS = ["page_view", "product_view", "add_to_cart", "favorite", "checkout_started", "purchase"] as const;
export const siteEventSchema = z.object({
  id: z.string().uuid(), session: z.string().uuid(), event: z.enum(SITE_EVENTS),
  path: z.string().max(300).refine((path) => analyticsPath(path) !== null, "Caminho público inválido.").transform((path) => analyticsPath(path)!),
  productId: z.string().uuid().optional(),
}).strict();
export type SiteEventInput = z.infer<typeof siteEventSchema>;
export type SiteEvent = SiteEventInput & { at: string };
export type TrafficRange = { from: string | null; to: string | null; error?: string };
const dateFormat = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const day = (iso: string) => {
  const parts = dateFormat.formatToParts(new Date(iso));
  const part = (name: string) => parts.find((entry) => entry.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

export function trafficSummary(events: SiteEvent[], range: TrafficRange) {
  const filtered = range.error ? [] : events.filter((event) => { const date = day(event.at); return (!range.from || date >= range.from) && (!range.to || date <= range.to); });
  const pages = new Map<string, number>();
  const days = new Map<string, number>();
  const counts = Object.fromEntries(SITE_EVENTS.map((event) => [event, 0])) as Record<typeof SITE_EVENTS[number], number>;
  const sessions = new Set<string>();
  for (const event of filtered) {
    counts[event.event]++;
    sessions.add(event.session);
    if (event.event === "page_view") {
      pages.set(event.path, (pages.get(event.path) ?? 0) + 1);
      const date = day(event.at); days.set(date, (days.get(date) ?? 0) + 1);
    }
  }
  return { counts, sessions: sessions.size, pages: [...pages].map(([path, views]) => ({ path, views })).sort((a, b) => b.views - a.views), days: [...days].map(([date, views]) => ({ date, views })).sort((a, b) => a.date.localeCompare(b.date)), total: filtered.length };
}
