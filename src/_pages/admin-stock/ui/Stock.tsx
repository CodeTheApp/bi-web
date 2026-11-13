"use client";
import { getStock, getStockMoves } from "@/shared/api/admin-reads";
import { withSortableHeaders } from "@/shared/ui/admin/table-columns";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridPagination } from "@/shared/ui/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/shared/ui/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/shared/ui/reui/data-grid/data-grid-table";
import { Button } from "@/shared/ui/button";
import { STOCK_REASON_LABEL, type StockRow } from "@/entities/product";

import { GRID_PT } from "@/shared/lib/data-grid";
import { Icon } from "@/shared/ui/admin/icons";
import {
  ago,
  ErrorBox,
  PageHead,
  Seg,
  Skeleton,
  unwrap,
} from "@/shared/ui/admin/ui";
import { StockDialog, type StockTarget } from "@/features/manage-stock/client";

import { useStockListUrlState } from "@/features/manage-stock/client";
import type { StockFilter } from "@/features/manage-stock";

export function StockView() {
  const q = useQuery({
    queryKey: ["stock"],
    queryFn: ({ signal }) => unwrap(getStock({ signal })),
  });
  const moves = useQuery({
    queryKey: ["stockMoves"],
    queryFn: ({ signal }) => unwrap(getStockMoves(undefined, { signal })),
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
  } = useStockListUrlState();
  const [target, setTarget] = useState<StockTarget | null>(null);

  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (r) =>
        (filter === "todas" || r.stock !== 0) &&
        (!s ||
          r.product.toLowerCase().includes(s) ||
          r.sku.toLowerCase().includes(s) ||
          r.label.toLowerCase().includes(s)),
    );
  }, [all, filter, search]);

  const withStock = all.filter((r) => r.stock > 0);
  const units = withStock.reduce((s, r) => s + r.stock, 0);
  const products = new Set(withStock.map((r) => r.productId)).size;

  const columns = useMemo<ColumnDef<DataGridFeatures, StockRow>[]>(
    () => [
      {
        accessorKey: "product",
        header: "Produto",
        size: 220,
        cell: ({ row }) => (
          <span className="prod-cell">
            <span className="t">
              <Link
                href={`/admin/loja/${row.original.productId}`}
                onClick={(e) => e.stopPropagation()}
              >
                <b>{row.original.product}</b>
              </Link>
              <small>
                {row.original.label || "Variante única"} ·{" "}
                {row.original.stockPolicy === "estoque"
                  ? "só pronta entrega"
                  : "sob encomenda"}
              </small>
            </span>
          </span>
        ),
      },
      {
        accessorKey: "sku",
        header: "SKU",
        size: 120,
        cell: (i) => (
          <span className="mono muted">{i.getValue() as string}</span>
        ),
      },
      {
        accessorKey: "stock",
        header: "Saldo",
        size: 64,
        cell: ({ row }) => (
          <b
            style={{
              fontWeight: 500,
              color: row.original.stock < 0 ? "#A33" : undefined,
            }}
          >
            {row.original.stock}
          </b>
        ),
      },
      {
        id: "acao",
        header: "",
        size: 110,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              const r = row.original;
              setTarget({
                variantId: r.variantId,
                productId: r.productId,
                product: r.product,
                sku: r.sku,
                label: r.label,
                stock: r.stock,
              });
            }}
          >
            Movimentar
          </Button>
        ),
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
    getRowId: (r: StockRow) => r.variantId,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <>
      <PageHead
        title="Estoque"
        sub="Saldo de cada variante. Toda entrada, venda ou ajuste fica registrado com quem fez e quando."
      />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <div className="stats stats-three">
        <div className="card stat hl">
          <small>Unidades em estoque</small>
          <b>{q.data ? units : "—"}</b>
          <span>pronta entrega</span>
        </div>
        <div className="card stat">
          <small>Variantes com saldo</small>
          <b>{q.data ? withStock.length : "—"}</b>
          <span>de {all.length} cadastradas</span>
        </div>
        <div className="card stat">
          <small>Produtos com pronta entrega</small>
          <b>{q.data ? products : "—"}</b>
          <span>sem saldo, o produto sai da loja até entrar estoque</span>
        </div>
      </div>
      <div className="dash stockdash">
        {!q.data ? (
          <Skeleton h={420} />
        ) : (
          <div className="card">
            <div className="flt-bar">
              <label className="search in-card">
                <Icon name="search" />
                <input
                  placeholder="Buscar produto, acabamento ou SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <Seg<StockFilter>
                mobileSelect
                label="Filtrar estoque por saldo"
                value={filter}
                onChange={setFilter}
                options={[
                  ["saldo", "Com saldo"],
                  ["todas", "Todas as variantes"],
                ]}
              />
            </div>
            <DataGrid
              table={table}
              recordCount={rows.length}
              i18n={GRID_PT}
              emptyMessage={
                filter === "saldo"
                  ? "Nenhuma variante com saldo. Use “Todas as variantes” para lançar uma entrada."
                  : "Nenhuma variante encontrada."
              }
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
        <div className="card">
          <h3>Últimos movimentos</h3>
          {!moves.data ? (
            <div style={{ padding: "0 20px 20px" }}>
              <Skeleton h={200} />
            </div>
          ) : !moves.data.length ? (
            <div className="empty">Nenhum movimento ainda.</div>
          ) : (
            <ul className="lst log moves">
              {moves.data.slice(0, 40).map((m) => (
                <li key={m.id}>
                  <span className={`dl ${m.delta > 0 ? "in" : "out"}`}>
                    {m.delta > 0 ? `+${m.delta}` : m.delta}
                  </span>
                  <span className="t">
                    <b>{m.product}</b>
                    <span>
                      {STOCK_REASON_LABEL[m.reason]} · {m.label || m.sku}
                      {m.note && ` · ${m.note}`}
                    </span>
                  </span>
                  <small
                    className="muted"
                    title={new Date(m.at).toLocaleString("pt-BR")}
                  >
                    {ago(m.at)}
                    <br />
                    {m.by}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <StockDialog target={target} onClose={() => setTarget(null)} />
    </>
  );
}
