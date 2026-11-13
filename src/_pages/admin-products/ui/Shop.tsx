"use client";
import { getProducts } from "@/shared/api/admin-reads";
import { AsciiImage } from "@/shared/ui/ascii/AsciiImage";
import {
  type ColumnDef,
  type RowSelectionState,
  useTable,
} from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/shared/ui/reui/data-grid/data-grid";
import { DataGridPagination } from "@/shared/ui/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/shared/ui/reui/data-grid/data-grid-scroll-area";
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/shared/ui/reui/data-grid/data-grid-table";

import { Button } from "@/shared/ui/button";
import UndoButton from "@/shared/ui/kokonutui/undo-button";
import { withSortableHeaders } from "@/shared/ui/admin/table-columns";

import {
  brl,
  CATEGORIES,
  categoryName,
  type CategorySlug,
  type ProductStatus,
  type ProductSummary,
} from "@/entities/product";

import {
  createProduct,
  setProductsPolicy,
  setProductsStatus,
} from "@/server/catalog/actions";
import { GRID_PT } from "@/shared/lib/data-grid";

import { Icon } from "@/shared/ui/admin/icons";
import {
  Chip,
  Choice,
  ErrorBox,
  PageHead,
  Seg,
  Skeleton,
  unwrap,
  useToast,
} from "@/shared/ui/admin/ui";

import { useProductListUrlState } from "@/features/manage-products/client";
import type {
  ProductMediaFilter,
  ProductStatusFilter,
} from "@/features/manage-products";
import { ImportCatalogDialog } from "@/features/manage-products/client";
export { ProductEditor } from "@/widgets/product-editor";
export { StockDialog, type StockTarget } from "@/features/manage-stock/client";

export const priceRange = (min: number | null, max: number | null) =>
  min == null
    ? "Sob consulta"
    : min === max || max == null
      ? brl(min)
      : `${brl(min)} – ${brl(max)}`;

/* ---------------- lista de produtos ---------------- */

export function ProductList() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["products"],
    queryFn: ({ signal }) => unwrap(getProducts({ signal })),
  });
  const {
    search,
    setSearch,
    cat,
    setCat,
    status,
    setStatus,
    mediaF,
    setMediaF,
    sorting,
    setSorting,
    pagination,
    setPagination,
  } = useProductListUrlState();
  const [imp, setImp] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ProductStatus | null>(
    null,
  );
  const [selection, setSelection] = useState<RowSelectionState>({});

  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter(
      (p) =>
        (cat === "todas" || p.category === cat) &&
        (status === "todos" ||
          (status === "na-loja" && p.onSale) ||
          (status === "sem-estoque" && p.status === "publicado" && !p.onSale) ||
          p.status === status) &&
        (mediaF === "toda" ||
          (mediaF === "sem-foto" && p.photos === 0) ||
          (mediaF === "com-video" && p.videos > 0) ||
          (mediaF === "ocultas" && p.hiddenMedia > 0)) &&
        (!s ||
          p.title.toLowerCase().includes(s) ||
          p.skus.some((k) => k.toLowerCase().includes(s))),
    );
  }, [all, search, cat, status, mediaF]);
  // A URL controla a paginação; uma mudança de filtro limpa só a seleção local.
  const fk = `${search}|${cat}|${status}|${mediaF}`;
  const [filterKey, setFilterKey] = useState(fk);
  if (fk !== filterKey) {
    setFilterKey(fk);
    setSelection({});
  }

  const count = (s: ProductStatus) => all.filter((p) => p.status === s).length;
  const onSale = all.filter((p) => p.onSale).length;
  const selected = Object.keys(selection).filter((id) => selection[id]);

  const create = useMutation({
    mutationFn: () => unwrap(createProduct()),
    onSuccess: (id) => router.push(`/admin/loja/${id}`),
    onError: (e) => toast(e.message),
  });
  const bulkPolicy = useMutation({
    mutationFn: (ids: string[]) => unwrap(setProductsPolicy(ids, "encomenda")),
    onSuccess: (_data, ids) => {
      toast(
        `${ids.length} ${ids.length === 1 ? "produto passa" : "produtos passam"} a vender sob encomenda`,
      );
      setSelection((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !ids.includes(id)),
        ),
      );
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e) => toast(e.message),
  });
  const bulk = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ProductStatus }) =>
      unwrap(setProductsStatus(ids, status)),
    onSuccess: (_data, { ids, status }) => {
      const out =
        status === "publicado"
          ? all.filter(
              (product) => ids.includes(product.id) && !product.sellable,
            ).length
          : 0;
      toast(
        out
          ? `${ids.length - out} na loja · ${out} sem estoque ficam fora até entrar estoque (ou venda sob encomenda)`
          : `${ids.length} ${ids.length === 1 ? "produto" : "produtos"}: ${status}`,
      );
      setSelection((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !ids.includes(id)),
        ),
      );
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const columns = useMemo<ColumnDef<DataGridFeatures, ProductSummary>[]>(
    () => [
      {
        id: "select",
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        size: 40,
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: "Produto",
        size: 240,
        cell: ({ row }) => (
          <div className="prod-cell">
            <span className="th">
              {row.original.cover ? (
                <AsciiImage src={row.original.cover} alt="" loading="lazy" />
              ) : (
                <Icon name="tag" size={15} />
              )}
            </span>
            <span className="t">
              <b>{row.original.title}</b>
              <small>
                {row.original.variants}{" "}
                {row.original.variants === 1 ? "variante" : "variantes"}
                {row.original.finishes.length > 1 &&
                  ` · ${row.original.finishes.length} acabamentos`}
                {row.original.photos > 0 &&
                  ` · ${row.original.photos} ${row.original.photos === 1 ? "foto" : "fotos"}`}
                {row.original.videos > 0 &&
                  ` · ${row.original.videos} ${row.original.videos === 1 ? "vídeo" : "vídeos"}`}
                {row.original.hiddenMedia > 0 &&
                  ` · ${row.original.hiddenMedia} oculta${row.original.hiddenMedia === 1 ? "" : "s"}`}
              </small>
            </span>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Categoria",
        size: 130,
        cell: (i) => (
          <span className="muted">{categoryName(i.getValue() as string)}</span>
        ),
        meta: {
          headerClassName: "max-md:hidden",
          cellClassName: "max-md:hidden",
        },
      },
      {
        id: "price",
        accessorFn: (p) => p.minCents ?? -1,
        header: "Preço",
        size: 150,
        cell: ({ row }) => (
          <span className={row.original.minCents == null ? "muted" : undefined}>
            {priceRange(row.original.minCents, row.original.maxCents)}
          </span>
        ),
      },
      {
        accessorKey: "stock",
        header: "Estoque",
        size: 100,
        cell: ({ row }) =>
          row.original.stock > 0 ? (
            <b style={{ fontWeight: 500 }}>{row.original.stock} un.</b>
          ) : (
            <span className="muted">
              {row.original.sellable ? "Encomenda" : "Sem estoque"}
            </span>
          ),
        meta: {
          headerClassName: "max-md:hidden",
          cellClassName: "max-md:hidden",
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        cell: ({ row }) => (
          <Chip
            s={
              row.original.status === "publicado" && !row.original.onSale
                ? "fora"
                : row.original.status
            }
          />
        ),
      },
    ],
    [],
  );
  const table = useTable({
    features: dataGridFeatures,
    autoResetPageIndex: false,
    columns: withSortableHeaders(columns),
    data: rows,
    getRowId: (p: ProductSummary) => p.id,
    state: { sorting, pagination, rowSelection: selection },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setSelection,
    enableRowSelection: true,
  });

  return (
    <>
      <PageHead
        title="Produtos"
        sub={
          q.data
            ? `${all.length} produtos · ${onSale} na loja agora${count("publicado") > onSale ? ` · ${count("publicado") - onSale} publicados sem estoque (fora da loja)` : ""}`
            : "Catálogo da loja do site."
        }
      >
        <Button variant="outline" onClick={() => setImp(true)}>
          <Icon name="upload2" />
          Importar planilha
        </Button>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Icon name="plus" />
          Novo produto
        </Button>
      </PageHead>
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!q.data ? (
        <Skeleton h={480} />
      ) : !all.length ? (
        <div className="card empty stack" style={{ alignItems: "center" }}>
          <Icon name="tag" size={28} />
          <b style={{ color: "var(--ink)" }}>A loja ainda não tem produtos.</b>
          <span>
            Importe a planilha da loja antiga ou cadastre o primeiro produto.
          </span>
          <div className="row">
            <Button onClick={() => setImp(true)}>Importar planilha</Button>
            <Button variant="outline" onClick={() => create.mutate()}>
              Novo produto
            </Button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="flt-bar">
            <label className="search in-card">
              <Icon name="search" />
              <input
                placeholder="Buscar por nome ou SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <Choice
              label="Categoria"
              size="sm"
              className="w-[220px]"
              value={cat}
              options={[
                ["todas", "Todas as categorias"],
                ...CATEGORIES.map(
                  (c) => [c.slug, c.name] as [CategorySlug, string],
                ),
              ]}
              onChange={setCat}
            />
            <Choice<ProductMediaFilter>
              label="Fotos e vídeos"
              size="sm"
              className="w-[180px]"
              value={mediaF}
              options={[
                ["toda", "Fotos e vídeos"],
                [
                  "sem-foto",
                  `Sem foto (${all.filter((p) => p.photos === 0).length})`,
                ],
                [
                  "com-video",
                  `Com vídeo (${all.filter((p) => p.videos > 0).length})`,
                ],
                [
                  "ocultas",
                  `Com mídia oculta (${all.filter((p) => p.hiddenMedia > 0).length})`,
                ],
              ]}
              onChange={setMediaF}
            />
            <Seg<ProductStatusFilter>
              mobileSelect
              label="Filtrar produtos por situação"
              value={status}
              onChange={setStatus}
              options={[
                ["todos", `Todos ${all.length}`],
                ["na-loja", `Na loja ${onSale}`],
                ["sem-estoque", `Sem estoque ${count("publicado") - onSale}`],
                ["rascunho", `Rascunhos ${count("rascunho")}`],
                ["arquivado", `Arquivados ${count("arquivado")}`],
              ]}
            />
          </div>
          {selected.length > 0 && (
            <div className="bulk">
              <b>
                {selected.length}{" "}
                {selected.length === 1 ? "selecionado" : "selecionados"}
              </b>
              <Button
                size="sm"
                variant="dark"
                disabled={bulk.isPending || pendingStatus !== null}
                onClick={() =>
                  bulk.mutate({ ids: [...selected], status: "publicado" })
                }
              >
                Publicar
              </Button>
              <UndoButton
                label="Mover para rascunho"
                doneLabel="Movidos para rascunho"
                disabled={
                  bulk.isPending ||
                  bulkPolicy.isPending ||
                  (pendingStatus !== null && pendingStatus !== "rascunho")
                }
                onAction={() => setPendingStatus("rascunho")}
                onUndo={() => setPendingStatus(null)}
                onCommit={async () => {
                  try {
                    await bulk.mutateAsync({
                      ids: [...selected],
                      status: "rascunho",
                    });
                  } finally {
                    setPendingStatus(null);
                  }
                }}
              />
              <UndoButton
                label="Arquivar"
                doneLabel="Produtos arquivados"
                disabled={
                  bulk.isPending ||
                  bulkPolicy.isPending ||
                  (pendingStatus !== null && pendingStatus !== "arquivado")
                }
                onAction={() => setPendingStatus("arquivado")}
                onUndo={() => setPendingStatus(null)}
                onCommit={async () => {
                  try {
                    await bulk.mutateAsync({
                      ids: [...selected],
                      status: "arquivado",
                    });
                  } finally {
                    setPendingStatus(null);
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={bulkPolicy.isPending || pendingStatus !== null}
                onClick={() => bulkPolicy.mutate([...selected])}
                title="Ficam na loja mesmo sem saldo"
              >
                Vender sob encomenda
              </Button>
              <span className="sp" />
              <Button
                size="sm"
                variant="ghost"
                disabled={pendingStatus !== null}
                onClick={() => setSelection({})}
              >
                Limpar seleção
              </Button>
            </div>
          )}
          <DataGrid
            table={table}
            recordCount={rows.length}
            i18n={GRID_PT}
            emptyMessage="Nenhum produto com esses filtros."
            onRowClick={(p) => router.push(`/admin/loja/${p.id}`)}
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
      <ImportCatalogDialog open={imp} onClose={() => setImp(false)} />
    </>
  );
}
