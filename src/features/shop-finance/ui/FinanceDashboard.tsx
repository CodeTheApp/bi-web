"use client";

import type {
  ColumnDef,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import type { DataGridFeatures } from "@/shared/ui/reui/data-grid/data-grid";
import { AdminDataTable } from "@/shared/ui/admin/DataTable";
import { updateSorting } from "@/shared/lib/url-state/table-state";
import type { Movement } from "@/entities/shop-analytics/model";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/admin/icons";
import { ErrorBox, PageHead, Skeleton } from "@/shared/ui/admin/ui";
import { brl } from "@/entities/product";
import { financialSummary, methodLabel } from "@/entities/shop-analytics/model";
import { useShopAnalytics } from "@/entities/shop-analytics/model/use-shop-analytics";
import { AnalyticsFilters } from "@/entities/shop-analytics/ui/AnalyticsFilters";
import { AnalyticsMetrics } from "@/entities/shop-analytics/ui/AnalyticsMetrics";
import {
  AnalyticsPager,
  analyticsPage,
  ANALYTICS_PAGE_SIZE,
} from "@/entities/shop-analytics/ui/AnalyticsPager";
import { RevenueChart } from "@/entities/shop-analytics/ui/RevenueChart";
import { downloadCsv, movementsCsv } from "@/entities/shop-analytics/lib/csv";
import "@/entities/shop-analytics/ui/analytics.css";

const movementLabel = {
  recebido: "Pagamento aprovado",
  estorno: "Estorno registrado",
  aguardando: "Aguardando pagamento",
};
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sem data registrada";
const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

const columns: ColumnDef<DataGridFeatures, Movement>[] = [
  {
    accessorKey: "number",
    header: "Pedido",
    size: 110,
    cell: ({ row }) => (
      <Link
        className="analytics-order-link"
        href={`/admin/loja/pedidos/${row.original.orderId}`}
      >
        Nº {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "Cliente", size: 185 },
  {
    accessorKey: "kind",
    header: "Movimento",
    size: 180,
    cell: ({ row }) => (
      <span className={`analytics-kind ${row.original.kind}`}>
        {movementLabel[row.original.kind]}
      </span>
    ),
  },
  {
    accessorKey: "at",
    header: "Data · Brasília",
    size: 180,
    cell: ({ row }) => date(row.original.at),
  },
  {
    accessorKey: "method",
    header: "Pagamento",
    size: 155,
    cell: ({ row }) => methodLabel(row.original.method),
  },
  {
    id: "amountCents",
    accessorFn: (row) =>
      row.kind === "estorno" ? -row.amountCents : row.amountCents,
    header: "Valor",
    size: 150,
    meta: {
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
    },
    cell: ({ row }) => (
      <>
        {row.original.kind === "estorno" ? "− " : ""}
        {brl(row.original.amountCents)}
      </>
    ),
  },
];

export function FinanceDashboard() {
  const controls = useShopAnalytics("finance");
  const { query, filters, setFilters, range } = controls;
  const summary = financialSummary(
    query.data?.orders ?? [],
    range,
    filters.pagamento,
  );
  const search = fold(filters.busca.trim().replace(/^#/, ""));
  const rows = summary.movements.filter(
    (movement) =>
      (filters.movimento === "todos" || movement.kind === filters.movimento) &&
      (!search ||
        fold(`${movement.number} ${movement.customerName}`).includes(search)),
  );
  const page = analyticsPage(filters.pagina, rows.length);
  const pagination = { pageIndex: page - 1, pageSize: ANALYTICS_PAGE_SIZE };
  const setPagination = (updater: Updater<PaginationState>) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    void setFilters({ pagina: next.pageIndex + 1 });
  };
  const setSorting = (updater: Updater<SortingState>) => {
    void setFilters({
      ordenar: updateSorting(updater, filters.ordenar),
      pagina: 1,
    });
  };
  return (
    <div className="shop-analytics-page shop-finance-page">
      <PageHead
        title="Financeiro"
        sub="Pagamentos, estornos e valores aguardando confirmação na loja."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <Icon name="clock" />
          Atualizar
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!rows.length}
          onClick={() =>
            downloadCsv(
              `financeiro-${range.from ?? "historico"}-${range.to ?? "completo"}.csv`,
              movementsCsv(rows),
            )
          }
        >
          <Icon name="upload2" style={{ rotate: "180deg" }} />
          Exportar CSV
        </Button>
      </PageHead>
      <AnalyticsFilters controls={controls} finance />
      {range.error && (
        <div className="card analytics-range-error" role="alert">
          {range.error}
        </div>
      )}
      {query.error && (
        <ErrorBox error={query.error} retry={() => query.refetch()} />
      )}
      {!query.data ? (
        !query.error && (
          <div className="stack">
            <Skeleton h={110} />
            <Skeleton h={260} />
          </div>
        )
      ) : (
        <>
          <AnalyticsMetrics
            items={[
              {
                label: "Pagamentos aprovados",
                value: summary.receivedCents,
                detail: "Pela data registrada de aprovação",
                money: true,
                highlight: true,
              },
              {
                label: "Estornos registrados",
                value: summary.refundedCents,
                detail: "Pela data registrada de cancelamento",
                money: true,
              },
              {
                label: "Aprovado após estornos",
                value: summary.balanceCents,
                detail: "Aprovações menos estornos no período",
                money: true,
              },
              {
                label: "Aguardando pagamento",
                value: summary.pendingCents,
                detail: "Pedidos criados no período",
                money: true,
              },
            ]}
          />
          <p className="analytics-notes">
            Valores dos pedidos, incluindo frete. O período usa a data
            registrada de aprovação ou cancelamento com estorno; valores
            aguardando usam a criação do pedido. Horários de Brasília. Movimento
            e busca filtram a lista abaixo.
          </p>
          {summary.undated > 0 && filters.periodo !== "tudo" && (
            <p className="analytics-notes">
              {summary.undated} movimento(s) sem data registrada aparecem em
              “Todo o histórico”.
            </p>
          )}
          <div className="analytics-layout">
            <RevenueChart points={summary.series} />
            <section className="card">
              <div className="card-h">
                <b>Meios de pagamento</b>
              </div>
              <ul className="analytics-methods">
                {summary.methods.map((method) => (
                  <li key={method.method ?? "manual"}>
                    <span>
                      {methodLabel(method.method)}
                      <small>{brl(method.refundedCents)} em estornos</small>
                    </span>
                    <b>{brl(method.receivedCents)}</b>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <section
            className="card analytics-table"
            aria-labelledby="finance-transactions-title"
          >
            <div className="card-h">
              <b id="finance-transactions-title">Movimentos</b>
              <small>{rows.length} registro(s)</small>
            </div>
            <AdminDataTable
              rows={rows}
              columns={columns}
              sorting={filters.ordenar}
              onSortingChange={setSorting}
              pagination={pagination}
              onPaginationChange={setPagination}
              showPagination={false}
              empty="Nenhum movimento encontrado neste período."
            />
            {!rows.length && (
              <div className="analytics-empty">
                <Link href="/admin/loja/pedidos">Ver pedidos da loja →</Link>
              </div>
            )}
            <AnalyticsPager
              page={page}
              count={rows.length}
              onChange={(pagina) => void setFilters({ pagina })}
            />
          </section>
        </>
      )}
    </div>
  );
}
