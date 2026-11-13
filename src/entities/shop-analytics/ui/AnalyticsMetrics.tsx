import { brl } from "@/entities/product";

export function AnalyticsMetrics({ items }: { items: Array<{ label: string; value: number | string; detail: string; money?: boolean; highlight?: boolean }> }) {
  return <div className="stats analytics-metrics">{items.map((item) => <div className={`card stat${item.highlight ? " hl" : ""}`} key={item.label}><small>{item.label}</small><b>{item.money && typeof item.value === "number" ? brl(item.value) : item.value}</b><span>{item.detail}</span></div>)}</div>;
}
