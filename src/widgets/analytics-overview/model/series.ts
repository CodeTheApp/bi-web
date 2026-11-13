import type { MetricPoint } from "@/shared/ui/kokonutui/metric-card";

/** Include the preceding period so comparisons use registered history. */
export function dailySeries(
  values: ReadonlyMap<string, number>,
  today: string,
  divisor = 1,
): MetricPoint[] {
  return Array.from({ length: 180 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 179 + index);
    const day = date.toISOString().slice(0, 10);
    return { date: day, parts: [(values.get(day) ?? 0) / divisor] };
  });
}
