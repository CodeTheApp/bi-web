import { brl } from "@/entities/product";
import type { SeriesPoint } from "../model/types";

export function RevenueChart({ points }: { points: SeriesPoint[] }) {
  const monthly = points.length > 1 && (new Date(points[points.length - 1].day).getTime() - new Date(points[0].day).getTime()) / 86_400_000 > 62;
  const groups = new Map<string, SeriesPoint>();
  for (const point of points) {
    const key = monthly ? point.day.slice(0, 7) : point.day;
    const group = groups.get(key) ?? { day: key, receivedCents: 0, refundedCents: 0, orders: 0 };
    group.receivedCents += point.receivedCents;
    group.refundedCents += point.refundedCents;
    group.orders += point.orders;
    groups.set(key, group);
  }
  const series = [...groups.values()];
  const max = Math.max(1, ...series.flatMap((point) => [point.receivedCents, point.refundedCents]));
  const tickEvery = Math.max(1, Math.ceil(series.length / 8));
  return (
    <section className="card analytics-chart-card" aria-labelledby="analytics-revenue-title">
      <div className="card-h"><b id="analytics-revenue-title">Pagamentos e estornos</b><span className="analytics-legend"><i />Aprovados <i className="refund" />Estornos</span></div>
      {series.length ? <figure className="analytics-chart" aria-label={`Pagamentos e estornos por ${monthly ? "mês" : "dia"}`}>
        <div className="analytics-bars">{series.map((point, index) => <div className="analytics-bar-group" key={point.day}>
          <div className="analytics-bar-track"><span className="analytics-bar" style={{ height: `${Math.max(point.receivedCents ? 2 : 0, point.receivedCents / max * 100)}%` }} title={`${point.day}: ${brl(point.receivedCents)} aprovados`} /><span className="analytics-bar refund" style={{ height: `${Math.max(point.refundedCents ? 2 : 0, point.refundedCents / max * 100)}%` }} title={`${point.day}: ${brl(point.refundedCents)} em estornos`} /></div>
          <span className="analytics-tick">{index % tickEvery === 0 || index === series.length - 1 ? point.day.split("-").reverse().slice(0, 2).join("/") : ""}</span>
        </div>)}</div>
        <figcaption className="hint">Passe sobre as barras para conferir os valores. Apenas {monthly ? "meses" : "dias"} com movimentos são mostrados.</figcaption>
        <details className="analytics-data-table"><summary>Ver valores do gráfico</summary><table className="tbl"><thead><tr><th>Data</th><th>Aprovados</th><th>Estornos</th></tr></thead><tbody>{series.map((point) => <tr key={point.day}><td>{point.day}</td><td>{brl(point.receivedCents)}</td><td>{brl(point.refundedCents)}</td></tr>)}</tbody></table></details>
      </figure> : <div className="empty">Nenhum pagamento ou estorno registrado neste período.</div>}
    </section>
  );
}
