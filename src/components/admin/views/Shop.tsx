"use client";
import { type ColumnDef, type PaginationState, type RowSelectionState, type SortingState, useTable } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable, DataGridTableRowSelect, DataGridTableRowSelectAll } from "@/components/reui/data-grid/data-grid-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  brl,
  canSell,
  CATEGORIES,
  categoryName,
  OPTION_TYPES,
  optionName,
  SPEC_FIELDS,
  STOCK_REASON_LABEL,
  variantLabel,
  type CategorySlug,
  type Product,
  type ProductStatus,
  type ProductSummary,
  type StockReason,
  type Variant,
} from "@/lib/catalog/types";
import { isMediaCsv } from "@/lib/catalog/import";
import { createProduct, deleteProduct, getProductAdmin, getProducts, importCatalog, importMedia, moveStock, saveProduct, setProductsPolicy, setProductsStatus } from "@/server/catalog/actions";
import { GRID_PT } from "../grid";
import { ProductMediaManager, withIds, type MediaItemState } from "./ProductMedia";
import { Icon } from "../icons";
import { Chip, Choice, ErrorBox, Modal, PageHead, Seg, Skeleton, Switch, unwrap, useToast } from "../ui";

/* ---------------- utilidades ---------------- */
export const priceRange = (min: number | null, max: number | null) => (min == null ? "Sob consulta" : min === max || max == null ? brl(min) : `${brl(min)} – ${brl(max)}`);

const parseMoney = (s: string) => {
  const t = s.replace(/[^\d,.]/g, "");
  if (!t) return null;
  // "1.234,56" ou "1234.56"
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
const moneyText = (c: number | null) =>
  c == null
    ? ""
    : (c / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

function MoneyInput({ value, onChange, label }: { value: number | null; onChange: (c: number | null) => void; label: string }) {
  const [text, setText] = useState(moneyText(value));
  const [focus, setFocus] = useState(false);
  const shown = focus ? text : moneyText(value);
  return (
    <div className="money">
      <span>R$</span>
      <input
        aria-label={label}
        inputMode="decimal"
        placeholder="sob consulta"
        value={shown}
        onFocus={() => {
          setText(moneyText(value));
          setFocus(true);
        }}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocus(false);
          onChange(parseMoney(text));
        }}
      />
    </div>
  );
}

/* ---------------- lista de produtos ---------------- */
type StatusFilter = "todos" | "na-loja" | "sem-estoque" | "rascunho" | "arquivado";
type MediaFilter = "toda" | "sem-foto" | "com-video" | "ocultas";

export function ProductList() {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["products"],
    queryFn: () => unwrap(getProducts()),
  });
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<"todas" | CategorySlug>("todas");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [mediaF, setMediaF] = useState<MediaFilter>("toda");
  const [imp, setImp] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
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
        (!s || p.title.toLowerCase().includes(s) || p.skus.some((k) => k.toLowerCase().includes(s))),
    );
  }, [all, search, cat, status, mediaF]);
  // filtro novo volta para a primeira página e limpa a seleção
  const [filterKey, setFilterKey] = useState("");
  const fk = `${search}|${cat}|${status}|${mediaF}`;
  if (fk !== filterKey) {
    setFilterKey(fk);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
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
    mutationFn: () => unwrap(setProductsPolicy(selected, "encomenda")),
    onSuccess: () => {
      toast(`${selected.length} ${selected.length === 1 ? "produto passa" : "produtos passam"} a vender sob encomenda`);
      setSelection({});
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e) => toast(e.message),
  });
  const bulk = useMutation({
    mutationFn: (s: ProductStatus) => unwrap(setProductsStatus(selected, s)),
    onSuccess: (_d, s) => {
      const out = s === "publicado" ? all.filter((p) => selected.includes(p.id) && !p.sellable).length : 0;
      toast(
        out
          ? `${selected.length - out} na loja · ${out} sem estoque ficam fora até entrar estoque (ou venda sob encomenda)`
          : `${selected.length} ${selected.length === 1 ? "produto" : "produtos"}: ${s}`,
      );
      setSelection({});
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
    },
    onError: (e) => toast(e.message),
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
            <span className="th" style={row.original.cover ? { backgroundImage: `url("${row.original.cover}")` } : undefined}>
              {!row.original.cover && <Icon name="tag" size={15} />}
            </span>
            <span className="t">
              <b>{row.original.title}</b>
              <small>
                {row.original.variants} {row.original.variants === 1 ? "variante" : "variantes"}
                {row.original.finishes.length > 1 && ` · ${row.original.finishes.length} acabamentos`}
                {row.original.photos > 0 && ` · ${row.original.photos} ${row.original.photos === 1 ? "foto" : "fotos"}`}
                {row.original.videos > 0 && ` · ${row.original.videos} ${row.original.videos === 1 ? "vídeo" : "vídeos"}`}
                {row.original.hiddenMedia > 0 && ` · ${row.original.hiddenMedia} oculta${row.original.hiddenMedia === 1 ? "" : "s"}`}
              </small>
            </span>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: "Categoria",
        size: 130,
        cell: (i) => <span className="muted">{categoryName(i.getValue() as string)}</span>,
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
        cell: ({ row }) => <span className={row.original.minCents == null ? "muted" : undefined}>{priceRange(row.original.minCents, row.original.maxCents)}</span>,
      },
      {
        accessorKey: "stock",
        header: "Estoque",
        size: 100,
        cell: ({ row }) =>
          row.original.stock > 0 ? (
            <b style={{ fontWeight: 600 }}>{row.original.stock} un.</b>
          ) : (
            <span className="muted">{row.original.sellable ? "Encomenda" : "Sem estoque"}</span>
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
        cell: ({ row }) => <Chip s={row.original.status === "publicado" && !row.original.onSale ? "fora" : row.original.status} />,
      },
    ],
    [],
  );
  const table = useTable({
    features: dataGridFeatures,
    columns,
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
      <PageHead title="Produtos" sub={
          q.data
            ? `${all.length} produtos · ${onSale} na loja agora${count("publicado") > onSale ? ` · ${count("publicado") - onSale} publicados sem estoque (fora da loja)` : ""}`
            : "Catálogo da loja do site."
        }>
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
          <span>Importe a planilha da loja antiga ou cadastre o primeiro produto.</span>
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
              <input placeholder="Buscar por nome ou SKU…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <Choice
              label="Categoria"
              size="sm"
              className="w-[220px]"
              value={cat}
              options={[["todas", "Todas as categorias"], ...CATEGORIES.map((c) => [c.slug, c.name] as [CategorySlug, string])]}
              onChange={setCat}
            />
            <Choice<MediaFilter>
              label="Fotos e vídeos"
              size="sm"
              className="w-[180px]"
              value={mediaF}
              options={[
                ["toda", "Fotos e vídeos"],
                ["sem-foto", `Sem foto (${all.filter((p) => p.photos === 0).length})`],
                ["com-video", `Com vídeo (${all.filter((p) => p.videos > 0).length})`],
                ["ocultas", `Com mídia oculta (${all.filter((p) => p.hiddenMedia > 0).length})`],
              ]}
              onChange={setMediaF}
            />
            <Seg<StatusFilter>
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
                {selected.length} {selected.length === 1 ? "selecionado" : "selecionados"}
              </b>
              <Button size="sm" variant="dark" disabled={bulk.isPending} onClick={() => bulk.mutate("publicado")}>
                Publicar
              </Button>
              <Button size="sm" variant="outline" disabled={bulk.isPending} onClick={() => bulk.mutate("rascunho")}>
                Mover para rascunho
              </Button>
              <Button size="sm" variant="ghost" disabled={bulk.isPending} onClick={() => bulk.mutate("arquivado")}>
                Arquivar
              </Button>
              <Button size="sm" variant="outline" disabled={bulkPolicy.isPending} onClick={() => bulkPolicy.mutate()} title="Ficam na loja mesmo sem saldo">
                Vender sob encomenda
              </Button>
              <span className="sp" />
              <Button size="sm" variant="ghost" onClick={() => setSelection({})}>
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
      <ImportDialog open={imp} onClose={() => setImp(false)} />
    </>
  );
}

/* ---------------- importação ---------------- */
type Done<T> = T extends Promise<{ ok: true; data: infer D } | { ok: false; error: string }> ? D : never;
type ImportOutcome = { kind: "produtos"; r: Done<ReturnType<typeof importCatalog>> } | { kind: "midia"; r: Done<ReturnType<typeof importMedia>> };

/** Uma janela para as duas planilhas: a de produtos (loja antiga) e a de fotos/vídeos (colunas SKU e URL). */
function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const m = useMutation({
    mutationFn: async (f: File): Promise<ImportOutcome> => {
      const buf = await f.arrayBuffer();
      let text = new TextDecoder("utf-8").decode(buf);
      if (text.includes("\uFFFD")) text = new TextDecoder("windows-1252").decode(buf); // planilhas salvas no Excel antigo
      return isMediaCsv(text) ? { kind: "midia", r: await unwrap(importMedia(text)) } : { kind: "produtos", r: await unwrap(importCatalog(text)) };
    },
    onSuccess: (o) => {
      if (o.kind === "produtos") toast(o.r.created ? `${o.r.created} produtos importados` : "Planilha importada");
      else toast(`${o.r.videos + o.r.images} ${o.r.videos + o.r.images === 1 ? "item vinculado" : "itens vinculados"}`);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast(e.message),
  });
  const close = () => {
    setFile(null);
    m.reset();
    onClose();
  };
  const o = m.data;
  return (
    <Modal open={open} onClose={close} title="Importar planilha" description="Planilha de produtos da loja antiga ou planilha de fotos e vídeos (colunas SKU e URL), em .csv.">
      {o?.kind === "produtos" ? (
        <div className="stack">
          <div className="imp-res">
            <div>
              <b>{o.r.created}</b>
              <small>produtos novos</small>
            </div>
            <div>
              <b>{o.r.updatedPrices}</b>
              <small>preços atualizados</small>
            </div>
            <div>
              <b>{o.r.addedVariants}</b>
              <small>variantes acrescentadas</small>
            </div>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {o.r.rows} linhas lidas, agrupadas em {o.r.products} produtos
            {o.r.skipped > 0 && ` (${o.r.skipped} linhas ignoradas: item de teste ou SKU repetido)`}.
          </p>
          <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
            {o.r.byCategory.map(([c, n]) => (
              <span className="tag" key={c}>
                {c} · {n}
              </span>
            ))}
          </div>
          <p className="hint" style={{ margin: 0 }}>
            Os nomes foram organizados a partir da planilha (ex.: “PEND GODA BEGE 1XE27” vira “Pendente Goda”, com o acabamento como opção). Revise os títulos e acrescente fotos e
            descrições antes de divulgar.
          </p>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button onClick={close}>Ver produtos</Button>
          </div>
        </div>
      ) : o?.kind === "midia" ? (
        <div className="stack">
          <div className="imp-res">
            <div>
              <b>{o.r.videos}</b>
              <small>vídeos vinculados</small>
            </div>
            <div>
              <b>{o.r.images}</b>
              <small>fotos vinculadas</small>
            </div>
            <div>
              <b>{o.r.hidden.length}</b>
              <small>ocultos para conferir</small>
            </div>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            {o.r.rows} links lidos{o.r.checkedTitles > 0 && `, ${o.r.checkedTitles} vídeos conferidos pelo título`}
            {o.r.already > 0 && `, ${o.r.already} já estavam cadastrados`}
            {o.r.unmatchedCount > 0 && `, ${o.r.unmatchedCount} sem produto correspondente`}. Os novos entram no fim da galeria de cada produto.
          </p>
          {o.r.corrected.length > 0 && (
            <div className="imp-list">
              <b>Corrigidos pelo título do vídeo</b>
              <small className="muted">O título no YouTube traz o código da peça e apontava para outro produto que não o da planilha.</small>
              <ul>
                {o.r.corrected.map((c) => (
                  <li key={c.url}>
                    <span>{c.to}</span>
                    <span className="muted">planilha: {c.from}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {o.r.hidden.length > 0 && (
            <div className="imp-list">
              <b>Entraram ocultos para conferir</b>
              <small className="muted">Link repetido em produtos diferentes ou vídeo de outra peça. Abra, assista e publique só no produto certo.</small>
              <ul>
                {o.r.hidden.map((h) => (
                  <li key={h.productId}>
                    <Link href={`/admin/loja/${h.productId}`} onClick={close}>
                      {h.title}
                    </Link>
                    <span className="muted" title={h.note}>
                      {h.note ? "outra peça no vídeo" : h.sku}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {o.r.unmatched.length > 0 && (
            <div className="imp-list">
              <b>Sem produto correspondente</b>
              <ul>
                {o.r.unmatched.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button onClick={close}>Concluir</Button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <label className={`drop${file ? " on" : ""}`} style={{ minHeight: 120 }}>
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <span className="stack" style={{ gap: 6, alignItems: "center" }}>
              <Icon name="upload2" />
              {file ? <b>{file.name}</b> : "Escolher arquivo .csv"}
            </span>
          </label>
          <ul className="imp-rules">
            <li>
              <b>Produtos:</b> os itens de uma mesma peça viram um produto com variantes; produto novo entra publicado ou como rascunho, como estava na loja antiga; SKU que já existe só
              tem o preço atualizado.
            </li>
            <li>
              <b>Fotos e vídeos:</b> cada link é ligado ao produto pelo SKU (ou pelo nome) e entra no fim da galeria. Link repetido em produtos diferentes entra oculto, para conferir.
            </li>
            <li>Nada é apagado.</li>
          </ul>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button disabled={!file || m.isPending} onClick={() => file && m.mutate(file)}>
              {m.isPending ? "Importando…" : "Importar"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- movimento de estoque (usado aqui e na tela Estoque) ---------------- */
export type StockTarget = {
  variantId: string;
  productId: string;
  product: string;
  sku: string;
  label: string;
  stock: number;
};

export function StockDialog({ target, onClose, onDone }: { target: StockTarget | null; onClose: () => void; onDone?: (delta: number) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState<Exclude<StockReason, "inicial">>("compra");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [key, setKey] = useState<string | null>(null);
  if (target && key !== target.variantId) {
    setKey(target.variantId);
    setReason("compra");
    setQty("");
    setNote("");
  }
  const n = Number.parseInt(qty, 10);
  const valid = Number.isFinite(n) && (reason === "ajuste" ? n >= 0 : n > 0);
  const delta = !target || !valid ? 0 : reason === "ajuste" ? n - target.stock : reason === "venda" ? -n : n;
  const m = useMutation({
    mutationFn: () => unwrap(moveStock({ variantId: target!.variantId, delta, reason, note })),
    onSuccess: () => {
      toast("Estoque atualizado");
      onDone?.(delta);
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stockMoves"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (e) => toast(e.message),
  });
  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title="Movimentar estoque"
      description={target ? `${target.product}${target.label ? ` · ${target.label}` : ""} · ${target.sku}` : undefined}
    >
      {target && (
        <div className="stack">
          <Seg<Exclude<StockReason, "inicial">>
            value={reason}
            onChange={setReason}
            options={[
              ["compra", "Entrada"],
              ["venda", "Saída"],
              ["devolucao", "Devolução"],
              ["ajuste", "Inventário"],
            ]}
          />
          <div className="grid2">
            <label className="f">
              {reason === "ajuste" ? "Saldo contado" : "Quantidade"}
              <Input className="in" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} autoFocus />
            </label>
            <div className="stock-preview">
              <small>Saldo</small>
              <b>
                {target.stock} <span>→</span> {target.stock + delta}
              </b>
            </div>
          </div>
          <label className="f">
            Observação
            <small>Opcional. Ex.: nota fiscal 1234, venda para Fulano.</small>
            <Input className="in" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          </label>
          {target.stock + delta < 0 && (
            <p className="err" style={{ margin: 0 }}>
              O saldo vai ficar negativo. Confira a quantidade.
            </p>
          )}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={!valid || delta === 0 || m.isPending} onClick={() => m.mutate()}>
              {STOCK_REASON_LABEL[reason]}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------------- editor de produto ---------------- */
export function ProductEditor({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["product", id],
    queryFn: () => unwrap(getProductAdmin(id)),
  });
  if (q.error) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data)
    return q.isFetched ? (
      <div className="card pad">
        <b>Produto não encontrado.</b>
        <p className="muted">
          <Link href="/admin/loja">Voltar para Produtos</Link>
        </p>
      </div>
    ) : (
      <Skeleton h={500} />
    );
  return <ProductForm key={q.data.id} initial={q.data} />;
}

const blankVariant = (options: string[]): Variant => ({
  id: crypto.randomUUID(),
  sku: "",
  options: Object.fromEntries(options.map((o) => [o, ""])),
  priceCents: null,
  compareAtCents: null,
  stockPolicy: "encomenda",
  leadTimeDays: null,
  stock: 0,
  active: true,
  legacyName: "",
});

function ProductForm({ initial }: { initial: Product }) {
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [p, setP] = useState<Product>(initial);
  const [media, setMedia] = useState<MediaItemState[]>(() => withIds(initial.media));
  const [saved, setSaved] = useState(() => new Set(initial.variants.map((v) => v.id)));
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [stockFor, setStockFor] = useState<StockTarget | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const set = <K extends keyof Product>(k: K, v: Product[K]) => {
    setP((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };
  const setV = (id: string, patch: Partial<Variant>) =>
    set(
      "variants",
      p.variants.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    );
  const setMedia2 = (next: MediaItemState[]) => {
    setMedia(next);
    setDirty(true);
  };
  const toggleOption = (o: string, on: boolean) => {
    const options = OPTION_TYPES.map((t) => t.id as string).filter((t) => (t === o ? on : p.options.includes(t)));
    setP((x) => ({
      ...x,
      options,
      variants: x.variants.map((v) => ({
        ...v,
        options: Object.fromEntries(options.map((k) => [k, v.options[k] ?? ""])),
      })),
    }));
    setDirty(true);
  };

  // salva o produto como está na tela, ou uma versão já ajustada (ex.: "vender sob encomenda")
  type SaveArg = ProductStatus | { status: ProductStatus; product: Product };
  const argOf = (a: SaveArg) => (typeof a === "string" ? { status: a, product: p } : a);
  const save = useMutation({
    mutationFn: (arg: SaveArg) => {
      const { status, product } = argOf(arg);
      return unwrap(
        saveProduct({
          ...product,
          status,
          media: media.map(({ url, kind, alt, variantId, visible }) => ({ url, kind, alt, variantId, visible })),
        }),
      );
    },
    onSuccess: (r, arg) => {
      const { status, product } = argOf(arg);
      setP((x) => ({ ...x, status, slug: r.slug }));
      setSaved(new Set(product.variants.map((v) => v.id)));
      setDirty(false);
      toast(
        status === "publicado"
          ? product.variants.some(canSell)
            ? "Produto publicado na loja"
            : product.variants.some((v) => v.active)
              ? "Publicado, mas fora da loja: sem estoque. Lance uma entrada ou venda sob encomenda."
              : "Publicado, mas fora da loja: nenhuma variante está ativa."
          : status === "arquivado"
            ? "Produto arquivado"
            : "Rascunho salvo",
      );
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e) => toast(e.message),
  });
  const del = useMutation({
    mutationFn: () => unwrap(deleteProduct(p.id)),
    onSuccess: () => {
      setDirty(false);
      toast("Produto excluído");
      qc.invalidateQueries({ queryKey: ["products"] });
      router.push("/admin/loja");
    },
    onError: (e) => toast(e.message),
  });

  const slugFromTitle = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const otherSpecs = Object.keys(p.specs).filter((k) => !SPEC_FIELDS.some((f) => f.key === k));
  const variantChoices: Array<[string, string]> = [["", "Todas as variantes"], ...p.variants.map((v) => [v.id, variantLabel(v, p.options) || v.sku] as [string, string])];

  return (
    <>
      <div className="ph">
        <div style={{ minWidth: 0 }}>
          <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/admin/loja" style={{ marginLeft: -10 }}>
            <Icon name="back" />
            Produtos
          </Link>
          <h1 style={{ marginTop: 6 }}>{p.title || "Sem nome"}</h1>
        </div>
        <div className="row">
          <Chip s={p.status === "publicado" && !p.variants.some(canSell) ? "fora" : p.status} />
          {dirty && (
            <span className="muted" style={{ fontSize: 12 }}>
              Alterações não salvas
            </span>
          )}
          {initial.status === "publicado" && p.status === "publicado" && p.variants.some(canSell) && (
            <a className={buttonVariants({ variant: "outline" })} href={`/loja/${p.slug}`} target="_blank" rel="noopener">
              <Icon name="eye" />
              Ver na loja
            </a>
          )}
          <Button variant="outline" disabled={save.isPending} onClick={() => save.mutate("rascunho")}>
            Salvar rascunho
          </Button>
          <Button variant="dark" disabled={save.isPending} onClick={() => save.mutate("publicado")}>
            <Icon name="check" />
            {p.status === "publicado" ? "Atualizar publicação" : "Publicar"}
          </Button>
        </div>
      </div>

      <div className="ped">
        <div className="stack">
          <div className="card pad stack">
            <label className="f">
              Nome do produto
              <Input
                className="in"
                value={p.title}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!slugEdited && initial.status !== "publicado")
                    setP((x) => ({
                      ...x,
                      title: e.target.value,
                      slug: slugFromTitle(e.target.value),
                    }));
                }}
              />
            </label>
            <div className="grid2">
              <div
                className="f"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontWeight: 600,
                  fontSize: 12.5,
                }}
              >
                Categoria
                <Choice<CategorySlug> label="Categoria" value={p.category} options={CATEGORIES.map((c) => [c.slug, c.name])} onChange={(v) => set("category", v)} />
              </div>
              <label className="f">
                Endereço na loja
                <div className="money">
                  <span>/loja/</span>
                  <input
                    aria-label="Endereço"
                    value={p.slug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
                    }}
                  />
                </div>
              </label>
            </div>
            <label className="f">
              Descrição
              <small>Conte o que a peça tem de especial: desenho, materiais, onde fica bem.</small>
              <Textarea className="in" rows={5} value={p.description} onChange={(e) => set("description", e.target.value)} />
            </label>
          </div>
        </div>

        <div className="stack">
          <div className="card pad stack">
            <b>Status</b>
            <Seg<ProductStatus>
              value={p.status}
              options={[
                ["rascunho", "Rascunho"],
                ["publicado", "Publicado"],
                ["arquivado", "Arquivado"],
              ]}
              onChange={(s) => save.mutate(s)}
            />
            {p.status === "publicado" && !p.variants.some(canSell) ? (
              <Alert variant="warning" className="p-3">
                <AlertTitle>{p.variants.some((v) => v.active) ? "Fora da loja: sem estoque" : "Fora da loja: nenhuma variante ativa"}</AlertTitle>
                <AlertDescription>
                  {p.variants.some((v) => v.active)
                    ? "Publicado, mas nenhuma variante ativa tem saldo. Volta sozinho para a loja quando entrar estoque, ou se a venda for sob encomenda."
                    : "Publicado, mas todas as variantes estão desligadas (chave “Ativa” na tabela de variantes), como estavam na loja antiga."}
                  <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <Button
                      size="sm"
                      onClick={() => {
                        // sem nenhuma variante ativa, liga todas; com alguma ativa, mantém a escolha da equipe
                        const anyActive = p.variants.some((v) => v.active);
                        const next = { ...p, variants: p.variants.map((v) => ({ ...v, active: anyActive ? v.active : true, stockPolicy: "encomenda" as const })) };
                        setP(next);
                        save.mutate({ status: "publicado", product: next });
                      }}
                      disabled={save.isPending}
                    >
                      {p.variants.some((v) => v.active) ? "Vender sob encomenda" : "Ativar e vender sob encomenda"}
                    </Button>
                    {p.variants.some((v) => saved.has(v.id) && v.active) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const v = p.variants.find((x) => saved.has(x.id) && x.active)!;
                          setStockFor({ variantId: v.id, productId: p.id, product: p.title, sku: v.sku, label: variantLabel(v, p.options), stock: v.stock });
                        }}
                      >
                        Lançar estoque
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <small className="hint">
                Publicado aparece em /loja enquanto houver estoque (ou variante sob encomenda); sem estoque, sai sozinho e volta quando entrar. Arquivados saem da lista principal sem
                perder o histórico.
              </small>
            )}
          </div>

        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <ProductMediaManager media={media} onChange={setMedia2} variants={variantChoices} title={p.title} />
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h">
          <b>Variantes</b>
          <span className="muted" style={{ fontSize: 12 }}>
            O cliente escolhe por
          </span>
          {OPTION_TYPES.map((o) => (
            <label key={o.id} className="opt-t">
              <Checkbox checked={p.options.includes(o.id)} onCheckedChange={(v) => toggleOption(o.id, v === true)} />
              {o.name}
            </label>
          ))}
        </div>
        <div className="tw">
          <table className="vtbl">
            <thead>
              <tr>
                {p.options.map((o) => (
                  <th key={o}>{optionName(o)}</th>
                ))}
                <th>SKU</th>
                <th>Preço</th>
                <th>Venda</th>
                <th>Estoque</th>
                <th title="Aparece na loja">Ativa</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {p.variants.map((v) => (
                <tr key={v.id} className={v.active ? undefined : "off"}>
                  {p.options.map((o) => (
                    <td key={o}>
                      <input
                        className="cell"
                        aria-label={optionName(o)}
                        value={v.options[o] ?? ""}
                        onChange={(e) =>
                          setV(v.id, {
                            options: { ...v.options, [o]: e.target.value },
                          })
                        }
                      />
                    </td>
                  ))}
                  <td>
                    <input className="cell mono" aria-label="SKU" value={v.sku} onChange={(e) => setV(v.id, { sku: e.target.value.toUpperCase() })} />
                  </td>
                  <td>
                    <MoneyInput label="Preço" value={v.priceCents} onChange={(c) => setV(v.id, { priceCents: c })} />
                  </td>
                  <td>
                    <div className="row" style={{ gap: 6 }}>
                      <Choice<Variant["stockPolicy"]>
                        label="Venda"
                        size="sm"
                        className="w-[172px]"
                        value={v.stockPolicy}
                        options={[
                          ["estoque", "Só pronta entrega"],
                          ["encomenda", "Sob encomenda"],
                        ]}
                        onChange={(s) => setV(v.id, { stockPolicy: s })}
                      />
                      {v.stockPolicy === "encomenda" && (
                        <input
                          className="cell days"
                          aria-label="Prazo em dias úteis"
                          title="Prazo em dias úteis"
                          placeholder="prazo"
                          inputMode="numeric"
                          value={v.leadTimeDays ?? ""}
                          onChange={(e) => {
                            const d = e.target.value.replace(/\D/g, "");
                            setV(v.id, {
                              leadTimeDays: d ? Math.min(365, Number(d)) : null,
                            });
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="stk"
                      disabled={!saved.has(v.id)}
                      title={saved.has(v.id) ? "Movimentar estoque" : "Salve o produto antes de movimentar o estoque"}
                      onClick={() =>
                        setStockFor({
                          variantId: v.id,
                          productId: p.id,
                          product: p.title,
                          sku: v.sku,
                          label: variantLabel(v, p.options),
                          stock: v.stock,
                        })
                      }
                    >
                      <b>{v.stock}</b>
                      <Icon name="pen" size={13} />
                    </button>
                  </td>
                  <td>
                    <Switch checked={v.active} onChange={(a) => setV(v.id, { active: a })} title="Aparece na loja" />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rm"
                      aria-label="Remover variante"
                      disabled={p.variants.length === 1}
                      onClick={() =>
                        set(
                          "variants",
                          p.variants.filter((x) => x.id !== v.id),
                        )
                      }
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-f">
          <Button variant="outline" size="sm" onClick={() => set("variants", [...p.variants, blankVariant(p.options)])}>
            <Icon name="plus" />
            Adicionar variante
          </Button>
          <span className="hint">
            Preço vazio aparece como “sob consulta”. O estoque muda só por movimentos (lápis), para ficar registrado. Variante “só pronta entrega” sem saldo aparece esgotada; se
            nenhuma puder ser vendida, o produto sai da loja.
          </span>
        </div>
      </div>

      <div className="ped" style={{ marginTop: 18 }}>
        <div className="card pad stack">
          <b>Ficha técnica</b>
          <div className="grid2">
            {SPEC_FIELDS.map((f) => (
              <label className="f" key={f.key}>
                {f.label}
                <Input className="in" value={p.specs[f.key] ?? ""} onChange={(e) => set("specs", { ...p.specs, [f.key]: e.target.value })} />
              </label>
            ))}
            {otherSpecs.map((k) => (
              <label className="f" key={k}>
                {k}
                <Input className="in" value={p.specs[k] ?? ""} onChange={(e) => set("specs", { ...p.specs, [k]: e.target.value })} />
              </label>
            ))}
          </div>
          <small className="hint">Campos vazios não aparecem na loja.</small>
        </div>
        <div className="stack">
          {p.legacy.names.length > 0 && (
            <details className="card pad legacy">
              <summary>
                <b>Na planilha da loja antiga</b>
                <span className="muted">
                  {" "}
                  · {p.legacy.names.length} {p.legacy.names.length === 1 ? "nome" : "nomes"}
                </span>
              </summary>
              <ul>
                {p.legacy.names.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </details>
          )}

          <Button variant="ghost" style={{ alignSelf: "flex-start", color: "#A33" }} onClick={() => setConfirm(true)}>
            <Icon name="trash" />
            Excluir produto
          </Button>
        </div>
      </div>

      <StockDialog
        target={stockFor}
        onClose={() => setStockFor(null)}
        onDone={(d) => {
          const id = stockFor?.variantId;
          setP((x) => ({
            ...x,
            variants: x.variants.map((v) => (v.id === id ? { ...v, stock: v.stock + d } : v)),
          }));
        }}
      />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[26px] font-normal">Excluir “{p.title}”?</AlertDialogTitle>
            <AlertDialogDescription>O produto, as variantes e o histórico de estoque são apagados. Para só tirar da loja, prefira arquivar.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="bg-destructive text-white hover:bg-destructive/90" disabled={del.isPending} onClick={() => del.mutate()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
