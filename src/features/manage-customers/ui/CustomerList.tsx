"use client";
import { getCustomers } from "@/shared/api/admin-reads";
import { withSortableHeaders } from "@/shared/ui/admin/table-columns";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";

import { useMemo, useRef } from "react";
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

import { type Customer } from "@/entities/order";

import { GRID_PT } from "@/shared/lib/data-grid";
import { Icon } from "@/shared/ui/admin/icons";
import {
  ago,
  ErrorBox,
  PageHead,
  Skeleton,
  unwrap,
} from "@/shared/ui/admin/ui";

import { useCustomerListUrlState } from "@/features/manage-customers/model/use-customer-list-url-state";
import { CustomerDrawer } from "./CustomerDrawer";

type CustomerRow = Customer & { orders: number; spentCents: number };
export function CustomersView() {
  const q = useQuery({
    queryKey: ["customers"],
    queryFn: ({ signal }) => unwrap(getCustomers({ signal })),
  });
  const {
    search,
    setSearch,
    sorting,
    setSorting,
    pagination,
    setPagination,
    selectedCustomer,
    openCustomer,
    closeCustomer,
  } = useCustomerListUrlState();
  const opener = useRef<HTMLButtonElement | null>(null);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (c) =>
        !s ||
        c.name.toLowerCase().includes(s) ||
        c.email.includes(s) ||
        c.contactEmail?.toLowerCase().includes(s) ||
        c.phone.includes(s),
    );
  }, [all, search]);
  const columns = useMemo<ColumnDef<DataGridFeatures, CustomerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Cliente",
        size: 240,
        cell: ({ row }) => (
          <button
            type="button"
            className="customer-crm-open"
            aria-label={`Ver cadastro de ${row.original.name || row.original.email}`}
            onClick={(event) => {
              opener.current = event.currentTarget;
              openCustomer(row.original.id);
            }}
          >
            <strong>{row.original.name || "Sem nome"}</strong>
            <small>{row.original.contactEmail || row.original.email}</small>
          </button>
        ),
      },
      {
        accessorKey: "phone",
        header: "Celular",
        size: 140,
        cell: (i) => (
          <span className="muted">{(i.getValue() as string) || "—"}</span>
        ),
      },
      {
        accessorKey: "provider",
        header: "Entrou com",
        size: 110,
        cell: (i) => (
          <span className="muted">
            {i.getValue() === "google" ? "Google" : "Código por e-mail"}
          </span>
        ),
      },
      { accessorKey: "orders", header: "Pedidos", size: 80 },
      {
        accessorKey: "spentCents",
        header: "Comprou",
        size: 110,
        cell: (i) => (
          <b style={{ fontWeight: 500 }}>{brl(i.getValue() as number)}</b>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Desde",
        size: 110,
        cell: (i) => (
          <span className="muted">{ago(i.getValue() as string)}</span>
        ),
      },
    ],
    [openCustomer],
  );
  const tableColumns = useMemo(() => withSortableHeaders(columns), [columns]);
  const table = useTable({
    features: dataGridFeatures,
    columns: tableColumns,
    data: rows,
    getRowId: (r: CustomerRow) => r.id,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });
  return (
    <>
      <PageHead
        title="Clientes"
        sub="Quem criou conta na loja. A conta é criada no primeiro login, por código no e-mail ou Google."
      />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!q.data ? (
        <Skeleton h={360} />
      ) : (
        <div className="card customer-crm-library">
          <div className="flt-bar">
            <label className="search in-card">
              <Icon name="search" />
              <input
                ref={searchInput}
                aria-label="Buscar clientes por nome, e-mail ou celular"
                placeholder="Buscar por nome, e-mail ou celular…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <span className="muted">
              {all.length} {all.length === 1 ? "cliente" : "clientes"} ·{" "}
              {all.filter((c) => c.orders > 0).length} com pedido
            </span>
          </div>
          <DataGrid
            table={table}
            recordCount={rows.length}
            i18n={GRID_PT}
            emptyMessage="Nenhum cliente ainda."
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
      <CustomerDrawer
        id={selectedCustomer}
        onClose={closeCustomer}
        returnFocus={() => {
          if (opener.current?.isConnected) opener.current.focus();
          else searchInput.current?.focus();
        }}
      />
    </>
  );
}
