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
import type { AnalyticsOrder } from "@/entities/shop-analytics/model";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/admin/icons";
import { Chip, ErrorBox, PageHead, Skeleton } from "@/shared/ui/admin/ui";
import { brl, categoryName } from "@/entities/product";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/entities/order";
import { methodLabel, salesSummary } from "@/entities/shop-analytics/model";
import { useShopAnalytics } from "@/entities/shop-analytics/model/use-shop-analytics";
import { AnalyticsFilters } from "@/entities/shop-analytics/ui/AnalyticsFilters";
import { AnalyticsMetrics } from "@/entities/shop-analytics/ui/AnalyticsMetrics";
import {
  AnalyticsPager,
  analyticsPage,
  ANALYTICS_PAGE_SIZE,
} from "@/entities/shop-analytics/ui/AnalyticsPager";
import {
  downloadCsv,
  ordersCsv,
  productsCsv,
} from "@/entities/shop-analytics/lib/csv";
import "@/entities/shop-analytics/ui/analytics.css";

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

const orderColumns: ColumnDef<DataGridFeatures, AnalyticsOrder>[] = [
  {
    accessorKey: "number",
    header: "Pedido",
    size: 110,
    cell: ({ row }) => (
      <Link
        className="analytics-order-link"
        href={`/admin/loja/pedidos/${row.original.id}`}
      >
        Nº {row.original.number}
      </Link>
    ),
  },
  { accessorKey: "customerName", header: "Cliente", size: 185 },
  {
    accessorKey: "createdAt",
    header: "Data · Brasília",
    size: 140,
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }),
  },
  {
    accessorKey: "status",
    header: "Situação",
    size: 170,
    cell: ({ row }) => <Chip s={row.original.status} />,
  },
  {
    accessorKey: "method",
    header: "Pagamento",
    size: 150,
    cell: ({ row }) => methodLabel(row.original.method),
  },
  {
    accessorKey: "totalCents",
    header: "Total",
    size: 150,
    meta: {
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
    },
    cell: ({ row }) => brl(row.original.totalCents),
  },
];
type ProductSales = ReturnType<typeof salesSummary>["products"][number];
const productColumns: ColumnDef<DataGridFeatures, ProductSales>[] = [
  {
    accessorKey: "title",
    header: "Produto",
    size: 320,
    cell: ({ row }) => (
      <>
        <b>{row.original.title}</b>
        <span className="analytics-sub">
          {categoryName(row.original.category)}
        </span>
      </>
    ),
  },
  {
    accessorKey: "quantity",
    header: "Peças",
    size: 100,
    meta: { cellClassName: "tabular-nums" },
  },
  {
    accessorKey: "orders",
    header: "Pedidos pagos",
    size: 150,
    meta: { cellClassName: "tabular-nums" },
  },
  {
    accessorKey: "revenueCents",
    header: "Valor dos itens",
    size: 170,
    meta: {
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
    },
    cell: ({ row }) => brl(row.original.revenueCents),
  },
];

export function ReportsDashboard() {
  const controls = useShopAnalytics();
  const { query, filters, setFilters, range } = controls;
  const summary = salesSummary(
    query.data?.orders ?? [],
    range,
    filters.pagamento,
    filters.situacao,
  );
  const search = fold(filters.busca.trim().replace(/^#/, ""));
  const rows = summary.orders.filter(
    (order) =>
      !search || fold(`${order.number} ${order.customerName}`).includes(search),
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
  const categoryMax = Math.max(
    1,
    ...summary.categories.map((category) => category.revenueCents),
  );
  return (
    <div className="shop-analytics-page shop-reports-page">
      <PageHead
        title="Relatórios da loja"
        sub="Vendas, produtos e situação dos pedidos, com filtros compartilháveis."
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
              `pedidos-${range.from ?? "historico"}-${range.to ?? "completo"}.csv`,
              ordersCsv(rows),
            )
          }
        >
          <Icon name="upload2" style={{ rotate: "180deg" }} />
          Exportar pedidos
        </Button>
      </PageHead>
      <AnalyticsFilters controls={controls} />
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
                label: "Vendas pagas",
                value: summary.totalCents,
                detail: `${summary.paidOrders} pedido(s) pago(s), após descontos e com frete`,
                money: true,
                highlight: true,
              },
              {
                label: "Ticket médio",
                value: summary.averageCents,
                detail: "Total por pedido pago",
                money: true,
              },
              {
                label: "Peças vendidas",
                value: summary.quantity,
                detail: "Em pedidos pagos e não cancelados",
              },
              {
                label: "Cancelamentos",
                value: `${(summary.cancellationRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
                detail: `${summary.cancelled} de ${summary.orders.length} pedido(s)`,
              },
            ]}
          />
          <p className="analytics-notes">
            Período pela criação do pedido, no horário de Brasília. Vendas e
            ticket usam os totais após descontos, com frete, de pedidos pagos
            que permanecem ativos. Produtos e categorias mostram o valor dos
            itens antes dos descontos, sem frete. Os estornos por data estão no
            Financeiro. A busca filtra a lista de pedidos.
          </p>
          <div className="analytics-summary">
            <section className="card">
              <div className="card-h">
                <b>Valor dos itens por categoria</b>
              </div>
              {summary.categories.length ? (
                <ul className="analytics-bar-list">
                  {summary.categories.map((category) => (
                    <li key={category.category}>
                      <span>
                        {categoryName(category.category)}
                        <small className="analytics-sub">
                          {category.quantity} peça(s)
                        </small>
                      </span>
                      <b>{brl(category.revenueCents)}</b>
                      <span className="meter">
                        <i
                          style={{
                            width: `${(category.revenueCents / categoryMax) * 100}%`,
                          }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="analytics-empty">
                  Nenhuma venda paga neste período.
                </div>
              )}
            </section>
            <section className="card">
              <div className="card-h">
                <b>Pedidos por situação</b>
              </div>
              {summary.byStatus.length ? (
                <ul className="analytics-methods">
                  {summary.byStatus.map((status) => (
                    <li key={status.status}>
                      <span>
                        {ORDER_STATUS_LABEL[status.status as OrderStatus]}
                      </span>
                      <b>{status.count}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="analytics-empty">
                  Nenhum pedido neste período.
                </div>
              )}
            </section>
          </div>
          <section
            className="card analytics-table"
            style={{ marginBottom: 14 }}
          >
            <div className="card-h">
              <div className="analytics-section-heading">
                <b>Produtos mais vendidos</b>
                <small>Itens antes dos descontos, sem frete</small>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={!summary.products.length}
                onClick={() =>
                  downloadCsv(
                    `produtos-${range.from ?? "historico"}.csv`,
                    productsCsv(
                      summary.products.map((product) => ({
                        ...product,
                        category: categoryName(product.category),
                      })),
                    ),
                  )
                }
              >
                Exportar produtos
              </Button>
            </div>
            <AdminDataTable
              rows={summary.products}
              columns={productColumns}
              pageSize={10}
              empty="Os produtos aparecem aqui quando houver pedidos pagos."
            />
          </section>
          <section
            className="card analytics-table"
            aria-labelledby="report-orders-title"
          >
            <div className="card-h">
              <b id="report-orders-title">Pedidos do período</b>
              <small>{rows.length} pedido(s)</small>
            </div>
            <AdminDataTable
              rows={rows}
              columns={orderColumns}
              sorting={filters.ordenar}
              onSortingChange={setSorting}
              pagination={pagination}
              onPaginationChange={setPagination}
              showPagination={false}
              empty="Nenhum pedido encontrado com esses filtros."
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
