"use client";
import { type ColumnDef, type PaginationState, type SortingState, useTable } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Button } from "@/components/ui/button";
import { STOCK_REASON_LABEL, type StockRow } from "@/lib/catalog/types";
import { getStock, getStockMoves } from "@/server/catalog/actions";
import { GRID_PT } from "../grid";
import { Icon } from "../icons";
import { ago, ErrorBox, PageHead, Seg, Skeleton, unwrap } from "../ui";
import { StockDialog, type StockTarget } from "./Shop";

type Filter = "saldo" | "todas";

export function StockView() {
  const q = useQuery({ queryKey: ["stock"], queryFn: () => unwrap(getStock()) });
  const moves = useQuery({ queryKey: ["stockMoves"], queryFn: () => unwrap(getStockMoves()) });
  const [filter, setFilter] = useState<Filter>("saldo");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<StockTarget | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((r) => (filter === "todas" || r.stock !== 0) && (!s || r.product.toLowerCase().includes(s) || r.sku.toLowerCase().includes(s) || r.label.toLowerCase().includes(s)));
  }, [all, filter, search]);
  const [fk, setFk] = useState("");
  if (fk !== `${filter}|${search}`) {
    setFk(`${filter}|${search}`);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

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
              <Link href={`/admin/loja/${row.original.productId}`} onClick={(e) => e.stopPropagation()}>
                <b>{row.original.product}</b>
              </Link>
              <small>
                {row.original.label || "Variante única"} · {row.original.stockPolicy === "estoque" ? "só pronta entrega" : "sob encomenda"}
              </small>
            </span>
          </span>
        ),
      },
      { accessorKey: "sku", header: "SKU", size: 120, cell: (i) => <span className="mono muted">{i.getValue() as string}</span> },
      {
        accessorKey: "stock",
        header: "Saldo",
        size: 64,
        cell: ({ row }) => <b style={{ fontWeight: 600, color: row.original.stock < 0 ? "#A33" : undefined }}>{row.original.stock}</b>,
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
              setTarget({ variantId: r.variantId, productId: r.productId, product: r.product, sku: r.sku, label: r.label, stock: r.stock });
            }}
          >
            Movimentar
          </Button>
        ),
      },
    ],
    [],
  );
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (r: StockRow) => r.variantId,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <>
      <PageHead title="Estoque" sub="Saldo de cada variante. Toda entrada, venda ou ajuste fica registrado com quem fez e quando." />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <div className="stats" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
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
                <input placeholder="Buscar produto, acabamento ou SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
              <Seg<Filter> value={filter} onChange={setFilter} options={[["saldo", "Com saldo"], ["todas", "Todas as variantes"]]} />
            </div>
            <DataGrid
              table={table}
              recordCount={rows.length}
              i18n={GRID_PT}
              emptyMessage={filter === "saldo" ? "Nenhuma variante com saldo. Use “Todas as variantes” para lançar uma entrada." : "Nenhuma variante encontrada."}
              tableLayout={{ headerBackground: false, rowBorder: true, width: "auto" }}
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
                  <span className={`dl ${m.delta > 0 ? "in" : "out"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                  <span className="t">
                    <b>{m.product}</b>
                    <span>
                      {STOCK_REASON_LABEL[m.reason]} · {m.label || m.sku}
                      {m.note && ` · ${m.note}`}
                    </span>
                  </span>
                  <small className="muted" title={new Date(m.at).toLocaleString("pt-BR")}>
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
