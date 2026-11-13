"use client";
import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  brazilDay,
  financialSummary,
  salesSummary,
  type DateRange,
} from "@/entities/shop-analytics/model";
import { trafficSummary } from "@/entities/site-analytics";
import { brl, categoryName } from "@/entities/product";
import MetricCard from "@/shared/ui/kokonutui/metric-card";
import SpendingRing from "@/shared/ui/kokonutui/spending-ring";
import { AdminDataTable } from "@/shared/ui/admin/DataTable";
import { AdminBlockLoading } from "@/shared/ui/admin/AdminBlockLoading";
import type { DataGridFeatures } from "@/shared/ui/reui/data-grid/data-grid";
import { ErrorBox } from "@/shared/ui/admin/ui";
import { Icon } from "@/shared/ui/admin/icons";
import { useShopAnalyticsData, useSiteAnalyticsData } from "../model/queries";
import { dailySeries } from "../model/series";

type RangeProps = { range: DateRange };
type ChartProps = { days: number; onPeriodChange: (days: number) => void };
type PageRow = { id: string; path: string; views: number; share: number };
const ALL = { from: null, to: null };
const COLORS = [
  ["stroke-amber-600", "bg-amber-600"],
  ["stroke-stone-500", "bg-stone-500"],
  ["stroke-teal-700", "bg-teal-700"],
  ["stroke-orange-300", "bg-orange-300"],
  ["stroke-slate-400", "bg-slate-400"],
];

function PendingBlock({
  label,
  error,
  retry,
  minHeight,
  inline = false,
}: {
  label: string;
  error: unknown;
  retry: () => unknown;
  minHeight: number;
  inline?: boolean;
}) {
  return error ? (
    <div
      className={
        inline ? "analytics-inline-error" : "card analytics-block-error"
      }
      style={{ minHeight }}
    >
      <span className="sr-only">{label}</span>
      <ErrorBox error={error} retry={retry} />
    </div>
  ) : (
    <AdminBlockLoading
      label={label}
      minHeight={minHeight}
      variant={inline ? "inline" : "card"}
    />
  );
}

export function PaymentsChart({ days, onPeriodChange }: ChartProps) {
  const query = useShopAnalyticsData();
  const today = brazilDay(new Date());
  const data = useMemo(
    () =>
      dailySeries(
        new Map(
          financialSummary(query.data?.orders ?? [], ALL).series.map(
            (point) => [point.day, point.receivedCents],
          ),
        ),
        today,
        100,
      ),
    [query.data, today],
  );
  return (
    <div
      className="analytics-chart-frame"
      aria-label="Pagamentos aprovados"
      aria-busy={!query.data && query.isPending}
    >
      {query.data ? (
        <MetricCard
          className="admin-kokonut-chart"
          label="Pagamentos aprovados"
          segments={["Recebido"]}
          data={data}
          events={[]}
          currency="BRL"
          selectedPeriod={days}
          onPeriodChange={onPeriodChange}
        />
      ) : (
        <PendingBlock
          label="Carregando pagamentos"
          error={query.error}
          retry={() => query.refetch()}
          minHeight={360}
        />
      )}
    </div>
  );
}

export function VisitsChart({ days, onPeriodChange }: ChartProps) {
  const query = useSiteAnalyticsData();
  const today = brazilDay(new Date());
  const data = useMemo(
    () =>
      dailySeries(
        new Map(
          trafficSummary(query.data?.events ?? [], ALL).days.map((point) => [
            point.date,
            point.views,
          ]),
        ),
        today,
      ),
    [query.data, today],
  );
  return (
    <div
      className="analytics-chart-frame"
      aria-label="Visualizações do site"
      aria-busy={!query.data && query.isPending}
    >
      {query.data ? (
        <MetricCard
          className="admin-kokonut-chart"
          label="Visualizações do site"
          segments={["Páginas vistas"]}
          data={data}
          events={[]}
          format="number"
          selectedPeriod={days}
          onPeriodChange={onPeriodChange}
        />
      ) : (
        <PendingBlock
          label="Carregando visualizações"
          error={query.error}
          retry={() => query.refetch()}
          minHeight={360}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  pending,
  error,
  retry,
}: {
  label: string;
  value: string | number;
  pending: boolean;
  error: unknown;
  retry: () => unknown;
}) {
  return (
    <div className="analytics-kpi">
      {pending ? (
        <PendingBlock
          label={label}
          minHeight={54}
          inline
          error={error}
          retry={retry}
        />
      ) : (
        <>
          <span>{label}</span>
          <b>{value}</b>
        </>
      )}
    </div>
  );
}

export function TrafficMetrics({ range }: RangeProps) {
  const query = useSiteAnalyticsData();
  const visits = trafficSummary(query.data?.events ?? [], range);
  const state = {
    pending: !query.data,
    error: query.error,
    retry: () => query.refetch(),
  };
  return (
    <>
      <Metric label="Sessões observadas" value={visits.sessions} {...state} />
      <Metric
        label="Produtos visualizados"
        value={visits.counts.product_view}
        {...state}
      />
      <Metric
        label="Adições à sacola"
        value={visits.counts.add_to_cart}
        {...state}
      />
    </>
  );
}

export function ShopMetrics({ range }: RangeProps) {
  const query = useShopAnalyticsData();
  const sales = salesSummary(query.data?.orders ?? [], range);
  const state = {
    pending: !query.data,
    error: query.error,
    retry: () => query.refetch(),
  };
  return (
    <>
      <Metric label="Pedidos pagos" value={sales.paidOrders} {...state} />
      <Metric label="Ticket médio" value={brl(sales.averageCents)} {...state} />
    </>
  );
}

export function PopularPages({ range }: RangeProps) {
  const query = useSiteAnalyticsData();
  const visits = trafficSummary(query.data?.events ?? [], range);
  const rows = visits.pages.map((row) => ({
    ...row,
    id: row.path,
    share: visits.counts.page_view ? row.views / visits.counts.page_view : 0,
  }));
  const columns = useMemo<ColumnDef<DataGridFeatures, PageRow>[]>(
    () => [
      {
        accessorKey: "path",
        header: "Página",
        cell: ({ row }) => (
          <a
            className="analytics-page-link"
            href={row.original.path}
            target="_blank"
            rel="noopener"
          >
            {row.original.path}
          </a>
        ),
      },
      { accessorKey: "views", header: "Visualizações", size: 110 },
      {
        accessorKey: "share",
        header: "Participação",
        size: 100,
        cell: ({ row }) =>
          `${(row.original.share * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      },
    ],
    [],
  );
  return (
    <section
      className="card analytics-pages"
      aria-labelledby="analytics-pages-title"
      aria-busy={!query.data && query.isPending}
    >
      <div className="card-h">
        <h3 id="analytics-pages-title">Páginas mais vistas</h3>
        {query.data && <small>{visits.counts.page_view} visualizações</small>}
      </div>
      {query.data ? (
        <AdminDataTable
          rows={rows}
          columns={columns}
          empty="As páginas aparecem aqui conforme o site recebe visitas."
        />
      ) : (
        <PendingBlock
          label="Carregando páginas mais vistas"
          minHeight={390}
          inline
          error={query.error}
          retry={() => query.refetch()}
        />
      )}
    </section>
  );
}

export function CategorySales({ range }: RangeProps) {
  const query = useShopAnalyticsData();
  const categories = salesSummary(query.data?.orders ?? [], range)
    .categories.filter((entry) => entry.revenueCents > 0)
    .map((entry, index) => ({
      name: categoryName(entry.category),
      amount: entry.revenueCents / 100,
      stroke: COLORS[index % COLORS.length][0],
      dot: COLORS[index % COLORS.length][1],
    }));
  return (
    <section
      className="analytics-category-frame"
      aria-label="Vendas por categoria"
      aria-busy={!query.data && query.isPending}
    >
      {!query.data ? (
        <PendingBlock
          label="Carregando vendas por categoria"
          minHeight={440}
          error={query.error}
          retry={() => query.refetch()}
        />
      ) : categories.length ? (
        <SpendingRing
          className="analytics-category-card"
          title="Produtos por categoria · antes de descontos"
          categories={categories}
          currency="BRL"
        />
      ) : (
        <div className="card analytics-waiting">
          <Icon name="tag" size={26} />
          <h3>Vendas por categoria</h3>
          <p>O gráfico aparece quando houver pedidos pagos.</p>
          <Link href="/admin/loja/relatorios">Ver relatórios da loja →</Link>
        </div>
      )}
    </section>
  );
}

export function StoreInteractions({ range }: RangeProps) {
  const query = useSiteAnalyticsData();
  const visits = trafficSummary(query.data?.events ?? [], range);
  return (
    <section
      className="card analytics-funnel"
      aria-labelledby="analytics-interactions-title"
      aria-busy={!query.data && query.isPending}
    >
      <h3 id="analytics-interactions-title">Interações na loja</h3>
      {query.data ? (
        <div>
          {[
            ["Produtos vistos", visits.counts.product_view],
            ["Favoritos adicionados", visits.counts.favorite],
            ["Adições à sacola", visits.counts.add_to_cart],
            ["Checkouts iniciados", visits.counts.checkout_started],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </div>
      ) : (
        <PendingBlock
          label="Carregando interações"
          minHeight={100}
          inline
          error={query.error}
          retry={() => query.refetch()}
        />
      )}
    </section>
  );
}

export function AnalyticsSourceNote() {
  const { data } = useSiteAnalyticsData();
  if (!data) return null;
  return (
    <p className="analytics-overview-note">
      {data.dataMode === "examples"
        ? `Demonstração com ${data.syntheticEvents.toLocaleString("pt-BR")} eventos anônimos sintéticos nos últimos 90 dias, além das interações de teste neste ambiente.`
        : data.dataMode === "empty"
          ? "Ambiente sem exemplos: apenas interações de teste realizadas neste ambiente aparecem aqui."
          : "Tráfego anônimo recebido por este site, sem dados pessoais nem parâmetros da URL."}{" "}
      {data.startedAt
        ? `Histórico desde ${new Date(data.startedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
        : "A coleta começa nas próximas visitas."}{" "}
      Compras e pagamentos usam os pedidos registrados no ambiente selecionado.{" "}
      {data.truncated &&
        "O tráfego exibido está limitado aos 100 mil eventos mais recentes."}
    </p>
  );
}
