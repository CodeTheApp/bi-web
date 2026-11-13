"use client";
import { getOrders } from "@/shared/api/admin-reads";
import { withSortableHeaders } from "@/shared/ui/admin/table-columns";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridPagination } from "@/shared/ui/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/shared/ui/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/shared/ui/reui/data-grid/data-grid-table";

import { brl } from "@/entities/product";

import { type OrderStatus, type OrderSummary } from "@/entities/order";

import { GRID_PT } from "@/shared/lib/data-grid";
import { Icon } from "@/shared/ui/admin/icons";
import {
  ago,
  Chip,
  ErrorBox,
  PageHead,
  Seg,
  Skeleton,
  unwrap,
} from "@/shared/ui/admin/ui";

import { useOrderListUrlState } from "@/features/manage-orders/client";
import type { OrderFilter } from "@/features/manage-orders";
export { OrderAdmin } from "@/features/manage-orders/client";
export { CustomersView } from "@/features/manage-customers/client";

const OPEN: OrderStatus[] = [
  "aguardando_pagamento",
  "pago",
  "em_separacao",
  "enviado",
];
const PAID: OrderStatus[] = ["pago", "em_separacao", "enviado", "entregue"];

/* ---------------- lista ---------------- */
export function OrdersView() {
  const router = useRouter();
  const q = useQuery({
    queryKey: ["orders"],
    queryFn: ({ signal }) => unwrap(getOrders({ signal })),
  });
  const {
    filter,
    setFilter,
    search,
    setSearch,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useOrderListUrlState();
  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search
      .trim()
      .toLowerCase()
      .replace(/^#|^n[ºo]\s*/, "");
    return all.filter(
      (o) =>
        (filter === "todos" ||
          (filter === "abertos" && OPEN.includes(o.status)) ||
          (filter === "pagar" && o.status === "aguardando_pagamento") ||
          (filter === "enviar" &&
            (o.status === "pago" || o.status === "em_separacao"))) &&
        (!s ||
          String(o.number).includes(s) ||
          o.name.toLowerCase().includes(s) ||
          o.email.toLowerCase().includes(s)),
    );
  }, [all, filter, search]);

  const month = new Date().toISOString().slice(0, 7);
  const sold = all.filter(
    (o) => PAID.includes(o.status) && o.createdAt.startsWith(month),
  );
  const toPay = all.filter((o) => o.status === "aguardando_pagamento").length;
  const toShip = all.filter(
    (o) => o.status === "pago" || o.status === "em_separacao",
  ).length;

  const columns = useMemo<ColumnDef<DataGridFeatures, OrderSummary>[]>(
    () => [
      {
        accessorKey: "number",
        header: "Pedido",
        size: 120,
        cell: ({ row }) => (
          <span className="prod-cell">
            <span className="t">
              <b>Nº {row.original.number}</b>
              <small
                title={new Date(row.original.createdAt).toLocaleString("pt-BR")}
              >
                {ago(row.original.createdAt)}
              </small>
            </span>
          </span>
        ),
      },
      {
        accessorKey: "name",
        header: "Cliente",
        size: 220,
        cell: ({ row }) => (
          <span className="prod-cell">
            <span className="t">
              <b>{row.original.name}</b>
              <small>{row.original.email}</small>
            </span>
          </span>
        ),
      },
      {
        accessorKey: "items",
        header: "Peças",
        size: 70,
        cell: (i) => <span>{i.getValue() as number}</span>,
      },
      {
        accessorKey: "method",
        header: "Pagamento",
        size: 100,
        cell: (i) => (
          <span className="muted">
            {i.getValue() === "pix"
              ? "Pix"
              : i.getValue() === "cartao"
                ? "Cartão"
                : "—"}
          </span>
        ),
      },
      {
        accessorKey: "totalCents",
        header: "Total",
        size: 110,
        cell: (i) => (
          <b style={{ fontWeight: 500 }}>{brl(i.getValue() as number)}</b>
        ),
      },
      {
        accessorKey: "status",
        header: "Situação",
        size: 170,
        cell: (i) => <Chip s={i.getValue() as string} />,
      },
    ],
    [],
  );
  const tableColumns = useMemo(() => withSortableHeaders(columns), [columns]);
  const table = useTable({
    features: dataGridFeatures,
    autoResetPageIndex: false,
    columns: tableColumns,
    data: rows,
    getRowId: (r: OrderSummary) => r.id,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <>
      <PageHead
        title="Pedidos"
        sub="Compras feitas na loja. Abra um pedido para ver os itens, avançar a entrega ou cancelar."
      />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <div className="stats">
        <div className="card stat hl">
          <small>Vendido no mês</small>
          <b>
            {q.data ? brl(sold.reduce((s, o) => s + o.totalCents, 0)) : "—"}
          </b>
          <span>
            {sold.length} {sold.length === 1 ? "pedido pago" : "pedidos pagos"}
          </span>
        </div>
        <div className="card stat">
          <small>Para separar e enviar</small>
          <b>{q.data ? toShip : "—"}</b>
          <span>pagos, esperando a equipe</span>
        </div>
        <div className="card stat">
          <small>Aguardando pagamento</small>
          <b>{q.data ? toPay : "—"}</b>
          <span>Pix gerado ou cartão recusado</span>
        </div>
        <div className="card stat">
          <small>Ticket médio</small>
          <b>
            {q.data && sold.length
              ? brl(
                  Math.round(
                    sold.reduce((s, o) => s + o.totalCents, 0) / sold.length,
                  ),
                )
              : "—"}
          </b>
          <span>pedidos pagos no mês</span>
        </div>
      </div>
      {!q.data ? (
        <Skeleton h={420} />
      ) : !all.length ? (
        <div className="card empty stack" style={{ alignItems: "center" }}>
          <Icon name="receipt" size={28} />
          <b style={{ color: "var(--ink)" }}>Nenhum pedido ainda.</b>
          <span>Quando alguém comprar na loja, o pedido aparece aqui.</span>
        </div>
      ) : (
        <div className="card">
          <div className="flt-bar">
            <label className="search in-card">
              <Icon name="search" />
              <input
                placeholder="Buscar por número, nome ou e-mail…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <Seg<OrderFilter>
              mobileSelect
              label="Filtrar pedidos por situação"
              value={filter}
              onChange={setFilter}
              options={[
                [
                  "abertos",
                  `Em aberto ${all.filter((o) => OPEN.includes(o.status)).length}`,
                ],
                ["enviar", `Para enviar ${toShip}`],
                ["pagar", `Aguardando pagamento ${toPay}`],
                ["todos", `Todos ${all.length}`],
              ]}
            />
          </div>
          <DataGrid
            table={table}
            recordCount={rows.length}
            i18n={GRID_PT}
            emptyMessage="Nenhum pedido com esse filtro."
            onRowClick={(o) => router.push(`/admin/loja/pedidos/${o.id}`)}
            tableLayout={{
              dense: true,
              headerBackground: false,
              rowBorder: true,
              width: "auto",
            }}
          >
            <DataGridContainer border={false}>
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
            </DataGridContainer>
            <div className="grid-foot">
              <DataGridPagination sizes={[25, 50, 100]} />
            </div>
          </DataGrid>
        </div>
      )}
    </>
  );
}
