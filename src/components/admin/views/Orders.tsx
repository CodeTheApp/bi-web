"use client";
import { type ColumnDef, type PaginationState, type SortingState, useTable } from "@tanstack/react-table";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataGrid, DataGridContainer, dataGridFeatures, type DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { brl } from "@/lib/catalog/types";
import { waNumberLink } from "@/lib/links";
import { formatCep, NEXT_STATUS, ORDER_STATUS_LABEL, type Customer, type Order, type OrderStatus, type OrderSummary } from "@/lib/shop/types";
import { addOrderNote, getCustomers, getOrderAdmin, getOrders, setOrderStatus } from "@/server/shop/admin-actions";
import { GRID_PT } from "../grid";
import { Icon } from "../icons";
import { ago, Chip, ErrorBox, PageHead, Seg, Skeleton, unwrap, useToast } from "../ui";

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const OPEN: OrderStatus[] = ["aguardando_pagamento", "pago", "em_separacao", "enviado"];
const PAID: OrderStatus[] = ["pago", "em_separacao", "enviado", "entregue"];
type Filter = "abertos" | "pagar" | "enviar" | "todos";

/* ---------------- lista ---------------- */
export function OrdersView() {
  const router = useRouter();
  const q = useQuery({ queryKey: ["orders"], queryFn: () => unwrap(getOrders()), refetchInterval: 30_000 });
  const [filter, setFilter] = useState<Filter>("abertos");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase().replace(/^#|^n[ºo]\s*/, "");
    return all.filter(
      (o) =>
        (filter === "todos" ||
          (filter === "abertos" && OPEN.includes(o.status)) ||
          (filter === "pagar" && o.status === "aguardando_pagamento") ||
          (filter === "enviar" && (o.status === "pago" || o.status === "em_separacao"))) &&
        (!s || String(o.number).includes(s) || o.name.toLowerCase().includes(s) || o.email.toLowerCase().includes(s)),
    );
  }, [all, filter, search]);
  const [fk, setFk] = useState("");
  if (fk !== `${filter}|${search}`) {
    setFk(`${filter}|${search}`);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const month = new Date().toISOString().slice(0, 7);
  const sold = all.filter((o) => PAID.includes(o.status) && o.createdAt.startsWith(month));
  const toPay = all.filter((o) => o.status === "aguardando_pagamento").length;
  const toShip = all.filter((o) => o.status === "pago" || o.status === "em_separacao").length;

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
              <small title={new Date(row.original.createdAt).toLocaleString("pt-BR")}>{ago(row.original.createdAt)}</small>
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
      { accessorKey: "items", header: "Peças", size: 70, cell: (i) => <span>{i.getValue() as number}</span> },
      { accessorKey: "method", header: "Pagamento", size: 100, cell: (i) => <span className="muted">{i.getValue() === "pix" ? "Pix" : i.getValue() === "cartao" ? "Cartão" : "—"}</span> },
      { accessorKey: "totalCents", header: "Total", size: 110, cell: (i) => <b style={{ fontWeight: 600 }}>{brl(i.getValue() as number)}</b> },
      { accessorKey: "status", header: "Situação", size: 170, cell: (i) => <Chip s={i.getValue() as string} /> },
    ],
    [],
  );
  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (r: OrderSummary) => r.id,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
  });

  return (
    <>
      <PageHead title="Pedidos" sub="Compras feitas na loja. Abra um pedido para ver os itens, avançar a entrega ou cancelar." />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      <div className="stats">
        <div className="card stat hl">
          <small>Vendido no mês</small>
          <b>{q.data ? brl(sold.reduce((s, o) => s + o.totalCents, 0)) : "—"}</b>
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
          <b>{q.data && sold.length ? brl(Math.round(sold.reduce((s, o) => s + o.totalCents, 0) / sold.length)) : "—"}</b>
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
              <input placeholder="Buscar por número, nome ou e-mail…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <Seg<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                ["abertos", `Em aberto ${all.filter((o) => OPEN.includes(o.status)).length}`],
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
    </>
  );
}

/* ---------------- um pedido ---------------- */
const ACTION: Partial<Record<OrderStatus, { label: string; pickup?: string; variant?: "default" | "outline" }>> = {
  pago: { label: "Confirmar pagamento", variant: "outline" },
  em_separacao: { label: "Começar a separar" },
  enviado: { label: "Marcar como enviado", pickup: "Pronto para retirar" },
  entregue: { label: "Marcar como entregue", pickup: "Marcar como retirado" },
};

export function OrderAdmin({ id }: { id: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({ queryKey: ["order", id], queryFn: () => unwrap(getOrderAdmin(id)) });
  const [tracking, setTracking] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<OrderStatus | null>(null);

  const done = (o: Order) => {
    qc.setQueryData(["order", id], o);
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };
  const move = useMutation({
    mutationFn: (s: OrderStatus) => unwrap(setOrderStatus(id, s, { tracking: tracking ?? undefined })),
    onSuccess: (o) => {
      done(o);
      toast(`Pedido nº ${o.number}: ${ORDER_STATUS_LABEL[o.status].toLowerCase()}`);
      setConfirm(null);
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Não foi possível mudar o pedido."),
  });
  const addNote = useMutation({
    mutationFn: () => unwrap(addOrderNote(id, note)),
    onSuccess: (o) => {
      done(o);
      setNote("");
    },
    onError: (e) => toast(e instanceof Error ? e.message : "Não foi possível anotar."),
  });

  if (q.error) return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data)
    return q.isLoading ? (
      <Skeleton h={520} />
    ) : (
      <div className="card empty">
        Pedido não encontrado. <Link href="/admin/loja/pedidos">Voltar aos pedidos</Link>
      </div>
    );
  const o = q.data;
  const pickup = o.shipping.id === "retirada";
  const next = NEXT_STATUS[o.status].filter((s) => s !== "cancelado");
  const canCancel = NEXT_STATUS[o.status].includes("cancelado");
  const paid = o.status !== "aguardando_pagamento" && o.status !== "cancelado";
  const p = o.payment;
  const trackingValue = tracking ?? o.tracking;
  const units = o.items.reduce((s, i) => s + i.qty, 0);

  return (
    <>
      <PageHead
        title={
          <span className="row" style={{ gap: 14 }}>
            Pedido nº {o.number} <Chip s={o.status} />
          </span>
        }
        sub={`Feito ${fmt(o.createdAt)} · ${units} ${units === 1 ? "peça" : "peças"} · ${brl(o.totalCents)}`}
      >
        <Link href="/admin/loja/pedidos" className="muted">
          ← Todos os pedidos
        </Link>
      </PageHead>

      <div className="dash">
        <div className="stack">
          {(next.length > 0 || canCancel) && (
            <div className="card pad stack">
              <b>Próximo passo</b>
              {next.includes("enviado") && !pickup && (
                <label className="f">
                  Código de rastreio
                  <Input value={trackingValue} onChange={(e) => setTracking(e.target.value)} placeholder="Ex.: AA123456789BR" />
                </label>
              )}
              {o.status === "aguardando_pagamento" && (
                <p className="muted" style={{ margin: 0 }}>
                  {p?.method === "pix" ? "O Pix é confirmado sozinho pelo banco. Confirme à mão só se o comprovante chegou por outro caminho." : "O cartão foi recusado; o cliente pode tentar de novo pela página do pedido."} Confirmar baixa o estoque.
                </p>
              )}
              <div className="row" style={{ flexWrap: "wrap" }}>
                {next.map((s) => (
                  <Button key={s} variant={ACTION[s]?.variant ?? "default"} disabled={move.isPending} onClick={() => (s === "pago" ? setConfirm(s) : move.mutate(s))}>
                    {(pickup && ACTION[s]?.pickup) || ACTION[s]?.label || ORDER_STATUS_LABEL[s]}
                  </Button>
                ))}
                <span className="sp" />
                {canCancel && (
                  <Button variant="ghost" disabled={move.isPending} onClick={() => setConfirm("cancelado")}>
                    Cancelar pedido
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="card">
            <h3>Peças</h3>
            <ul className="lst log">
              {o.items.map((i) => (
                <li key={i.variantId}>
                  <span className="ord-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {i.image ? <img src={i.image} alt="" /> : <Icon name="tag" />}
                  </span>
                  <span className="t">
                    <b>
                      <Link href={`/admin/loja/${i.productId}`}>{i.title}</Link>
                    </b>
                    <span>
                      {i.label || "Variante única"} · <span className="mono">{i.sku}</span>
                    </span>
                  </span>
                  <span className="muted">
                    {i.qty} × {brl(i.priceCents)}
                  </span>
                  <b style={{ minWidth: 92, textAlign: "right" }}>{brl(i.qty * i.priceCents)}</b>
                </li>
              ))}
            </ul>
            <dl className="ord-tot">
              <div>
                <dt>Subtotal</dt>
                <dd>{brl(o.subtotalCents)}</dd>
              </div>
              <div>
                <dt>{o.shipping.label}</dt>
                <dd>{o.shippingCents ? brl(o.shippingCents) : "Grátis"}</dd>
              </div>
              <div className="big">
                <dt>Total</dt>
                <dd>{brl(o.totalCents)}</dd>
              </div>
            </dl>
          </div>

          <div className="card">
            <h3>Histórico e anotações</h3>
            <div className="pad stack" style={{ paddingTop: 0 }}>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anotação interna (o cliente não vê)…" rows={2} />
              <div className="row">
                <Button size="sm" variant="outline" disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
                  Anotar
                </Button>
              </div>
            </div>
            <ul className="lst log">
              {[...o.timeline].reverse().map((e, i) => (
                <li key={i}>
                  <Icon name={e.status === "nota" ? "pen" : e.status === "cancelado" ? "x" : "check"} />
                  <span className="t">
                    <b>{e.status === "criado" ? "Pedido feito" : e.status === "nota" ? "Anotação" : ORDER_STATUS_LABEL[e.status]}</b>
                    {e.note && <span style={{ whiteSpace: "normal" }}>{e.note}</span>}
                  </span>
                  <small className="muted" style={{ textAlign: "right" }}>
                    {fmt(e.at)}
                    <br />
                    {e.by}
                  </small>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="stack">
          <div className="card pad stack ord-kv">
            <b>Cliente</b>
            <p>
              {o.name}
              <br />
              <a href={`mailto:${o.email}`}>{o.email}</a>
              {o.phone && (
                <>
                  <br />
                  <a href={waNumberLink(o.phone, `Olá, ${o.name.split(" ")[0]}! Aqui é da Brasília Iluminação, sobre o seu pedido nº ${o.number}.`)} target="_blank" rel="noopener">
                    {o.phone} · WhatsApp
                  </a>
                </>
              )}
            </p>
          </div>
          <div className="card pad stack ord-kv">
            <b>{pickup ? "Retirada em Brasília" : "Entrega"}</b>
            {o.shipping.address ? (
              <p>
                {o.shipping.address.recipient}
                <br />
                {o.shipping.address.street}, {o.shipping.address.number}
                {o.shipping.address.complement && ` · ${o.shipping.address.complement}`}
                <br />
                {o.shipping.address.district} · {o.shipping.address.city}/{o.shipping.address.uf} · {formatCep(o.shipping.address.cep)}
              </p>
            ) : (
              <p>Combinar local e horário com o cliente.</p>
            )}
            <p className="muted">
              {o.shipping.label} · {o.shipping.days} · {o.shippingCents ? brl(o.shippingCents) : "grátis"}
            </p>
            {o.tracking && (
              <p>
                Rastreio <span className="mono">{o.tracking}</span>
              </p>
            )}
            {o.notes && <p className="hint">Observação do cliente: {o.notes}</p>}
          </div>
          <div className="card pad stack ord-kv">
            <b>Pagamento</b>
            {p ? (
              <>
                <p>
                  {p.method === "pix" ? "Pix" : `Cartão ${p.brand ?? ""} final ${p.last4} · ${p.installments && p.installments > 1 ? `${p.installments}x` : "à vista"}`}
                  <br />
                  <span className="muted">
                    {p.status === "aprovado" ? `Aprovado${p.paidAt ? ` ${fmt(p.paidAt)}` : ""}` : p.status === "estornado" ? "Estornado" : p.status === "recusado" ? `Recusado${p.message ? `: ${p.message}` : ""}` : "Aguardando"}
                  </span>
                </p>
                <p className="muted">
                  {p.provider === "simulado" ? "Pagamento simulado (modo demonstração)" : p.provider} · <span className="mono">{p.chargeId}</span>
                </p>
              </>
            ) : (
              <p className="muted">Sem cobrança gerada.</p>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirm != null} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-[26px] font-normal">{confirm === "cancelado" ? `Cancelar o pedido nº ${o.number}?` : `Confirmar o pagamento do pedido nº ${o.number}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "cancelado"
                ? paid
                  ? "As peças voltam para o estoque e o pagamento fica marcado como estornado. Faça o estorno no meio de pagamento, se ainda não fez."
                  : "O pedido sai da lista de abertos. Como não foi pago, o estoque não muda."
                : "Só confirme se o dinheiro já entrou. As peças saem do estoque agora."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && move.mutate(confirm)}>{confirm === "cancelado" ? "Cancelar pedido" : "Confirmar pagamento"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ---------------- clientes ---------------- */
type CustomerRow = Customer & { orders: number; spentCents: number };
export function CustomersView() {
  const q = useQuery({ queryKey: ["customers"], queryFn: () => unwrap(getCustomers()) });
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const all = useMemo(() => q.data ?? [], [q.data]);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return all.filter((c) => !s || c.name.toLowerCase().includes(s) || c.email.includes(s) || c.phone.includes(s));
  }, [all, search]);
  const columns = useMemo<ColumnDef<DataGridFeatures, CustomerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Cliente",
        size: 240,
        cell: ({ row }) => (
          <span className="prod-cell">
            <span className="t">
              <b>{row.original.name || "Sem nome"}</b>
              <small>{row.original.email}</small>
            </span>
          </span>
        ),
      },
      { accessorKey: "phone", header: "Celular", size: 140, cell: (i) => <span className="muted">{(i.getValue() as string) || "—"}</span> },
      { accessorKey: "provider", header: "Entrou com", size: 110, cell: (i) => <span className="muted">{i.getValue() === "google" ? "Google" : "Código por e-mail"}</span> },
      { accessorKey: "orders", header: "Pedidos", size: 80 },
      { accessorKey: "spentCents", header: "Comprou", size: 110, cell: (i) => <b style={{ fontWeight: 600 }}>{brl(i.getValue() as number)}</b> },
      { accessorKey: "createdAt", header: "Desde", size: 110, cell: (i) => <span className="muted">{ago(i.getValue() as string)}</span> },
    ],
    [],
  );
  const table = useTable({ features: dataGridFeatures, columns, data: rows, getRowId: (r: CustomerRow) => r.id, state: { sorting, pagination }, onSortingChange: setSorting, onPaginationChange: setPagination });
  return (
    <>
      <PageHead title="Clientes" sub="Quem criou conta na loja. A conta é criada no primeiro login, por código no e-mail ou Google." />
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
      {!q.data ? (
        <Skeleton h={360} />
      ) : (
        <div className="card">
          <div className="flt-bar">
            <label className="search in-card">
              <Icon name="search" />
              <input placeholder="Buscar por nome, e-mail ou celular…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <span className="muted">
              {all.length} {all.length === 1 ? "cliente" : "clientes"} · {all.filter((c) => c.orders > 0).length} com pedido
            </span>
          </div>
          <DataGrid table={table} recordCount={rows.length} i18n={GRID_PT} emptyMessage="Nenhum cliente ainda." tableLayout={{ headerBackground: false, rowBorder: true, width: "auto" }}>
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
