import { Button } from "@/shared/ui/button";

export const ANALYTICS_PAGE_SIZE = 25;
export function analyticsPage(requested: number, count: number) { return Math.max(1, Math.min(Math.max(1, Math.ceil(count / ANALYTICS_PAGE_SIZE)), requested)); }
export function AnalyticsPager({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / ANALYTICS_PAGE_SIZE));
  return <div className="card-f"><small className="muted">{count ? `${(page - 1) * ANALYTICS_PAGE_SIZE + 1}–${Math.min(page * ANALYTICS_PAGE_SIZE, count)} de ${count}` : "0 registros"}</small><span className="sp" /><Button variant="ghost" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>Anterior</Button><small className="muted">{page} / {pages}</small><Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</Button></div>;
}
