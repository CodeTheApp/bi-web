"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import type { OrderSummary } from "@/entities/order";
import { brl } from "@/entities/product";
import { Chip } from "@/shared/ui/admin/ui";
import { withSortableHeaders } from "@/shared/ui/admin/table-columns";
import { GRID_PT } from "@/shared/lib/data-grid";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridTable } from "@/shared/ui/reui/data-grid/data-grid-table";
import { DataGridScrollArea } from "@/shared/ui/reui/data-grid/data-grid-scroll-area";
import { DataGridPagination } from "@/shared/ui/reui/data-grid/data-grid-pagination";

const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
export function CustomerOrders({ orders }: { orders: OrderSummary[] }) {
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
  const columns = useMemo<ColumnDef<DataGridFeatures, OrderSummary>[]>(
    () =>
      withSortableHeaders([
        {
          accessorKey: "number",
          header: "Pedido",
          size: 95,
          cell: ({ row }) => (
            <Link
              className="customer-crm-order-link"
              href={`/admin/loja/pedidos/${row.original.id}`}
              aria-label={`Abrir pedido número ${row.original.number}`}
            >
              #{row.original.number}
            </Link>
          ),
        },
        {
          accessorKey: "status",
          header: "Status",
          size: 135,
          cell: ({ row }) => <Chip s={row.original.status} />,
        },
        {
          accessorKey: "totalCents",
          header: "Total",
          size: 110,
          cell: ({ row }) => brl(row.original.totalCents),
        },
        {
          accessorKey: "createdAt",
          header: "Data",
          size: 130,
          cell: ({ row }) => (
            <time dateTime={row.original.createdAt}>
              {date(row.original.createdAt)}
            </time>
          ),
        },
      ]),
    [],
  );
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: orders,
    getRowId: (order: OrderSummary) => order.id,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });
  return (
    <DataGrid
      table={table}
      recordCount={orders.length}
      i18n={GRID_PT}
      emptyMessage="Este cliente ainda não fez pedidos."
      tableLayout={{
        dense: true,
        width: "auto",
        rowBorder: true,
        headerBackground: false,
      }}
    >
      <DataGridContainer border={false}>
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
      </DataGridContainer>
      {orders.length > 5 && (
        <div className="customer-crm-orders-footer">
          <DataGridPagination sizes={[5, 10, 25]} />
        </div>
      )}
    </DataGrid>
  );
}
