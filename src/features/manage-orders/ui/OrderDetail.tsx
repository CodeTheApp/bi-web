"use client";
import { getOrderAdmin } from "@/shared/api/admin-reads";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { AsciiImage } from "@/shared/ui/ascii/AsciiImage";
import { AdminRouteLoading } from "@/shared/ui/admin/AdminBlockLoading";
import { brl } from "@/entities/product";
import { waNumberLink } from "@/entities/site-content";
import {
  formatCep,
  NEXT_STATUS,
  ORDER_STATUS_LABEL,
  type Order,
  type OrderStatus,
} from "@/entities/order";
import { addOrderNote, setOrderStatus } from "@/server/shop/admin-actions";

import { Icon } from "@/shared/ui/admin/icons";
import {
  Chip,
  ErrorBox,
  PageHead,
  unwrap,
  useToast,
} from "@/shared/ui/admin/ui";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const ACTION: Partial<
  Record<
    OrderStatus,
    { label: string; pickup?: string; variant?: "default" | "outline" }
  >
> = {
  pago: { label: "Confirmar pagamento", variant: "outline" },
  em_separacao: { label: "Começar a separar" },
  enviado: { label: "Marcar como enviado", pickup: "Pronto para retirar" },
  entregue: { label: "Marcar como entregue", pickup: "Marcar como retirado" },
};

export function OrderAdmin({ id }: { id: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const q = useQuery({
    queryKey: ["order", id],
    queryFn: ({ signal }) => unwrap(getOrderAdmin(id, { signal })),
  });
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
    mutationFn: (s: OrderStatus) =>
      unwrap(setOrderStatus(id, s, { tracking: tracking ?? undefined })),
    onSuccess: (o) => {
      done(o);
      toast(
        `Pedido nº ${o.number}: ${ORDER_STATUS_LABEL[o.status].toLowerCase()}`,
      );
      setConfirm(null);
    },
    onError: (e) =>
      toast(
        e instanceof Error ? e.message : "Não foi possível mudar o pedido.",
      ),
  });
  const addNote = useMutation({
    mutationFn: () => unwrap(addOrderNote(id, note)),
    onSuccess: (o) => {
      done(o);
      setNote("");
    },
    onError: (e) =>
      toast(e instanceof Error ? e.message : "Não foi possível anotar."),
  });

  if (q.error && !q.data)
    return <ErrorBox error={q.error} retry={() => q.refetch()} />;
  if (!q.data)
    return q.isLoading ? (
      <AdminRouteLoading detail />
    ) : (
      <div className="card empty">
        Pedido não encontrado.{" "}
        <Link href="/admin/loja/pedidos">Voltar aos pedidos</Link>
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
      {q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
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
                  <Input
                    value={trackingValue}
                    onChange={(e) => setTracking(e.target.value)}
                    placeholder="Ex.: AA123456789BR"
                  />
                </label>
              )}
              {o.status === "aguardando_pagamento" && (
                <p className="muted" style={{ margin: 0 }}>
                  {p?.method === "pix"
                    ? "O Pix é confirmado sozinho pelo banco. Confirme à mão só se o comprovante chegou por outro caminho."
                    : "O cartão foi recusado; o cliente pode tentar de novo pela página do pedido."}{" "}
                  Confirmar baixa o estoque.
                </p>
              )}
              <div className="row" style={{ flexWrap: "wrap" }}>
                {next.map((s) => (
                  <Button
                    key={s}
                    variant={ACTION[s]?.variant ?? "default"}
                    disabled={move.isPending}
                    onClick={() =>
                      s === "pago" ? setConfirm(s) : move.mutate(s)
                    }
                  >
                    {(pickup && ACTION[s]?.pickup) ||
                      ACTION[s]?.label ||
                      ORDER_STATUS_LABEL[s]}
                  </Button>
                ))}
                <span className="sp" />
                {canCancel && (
                  <Button
                    variant="ghost"
                    disabled={move.isPending}
                    onClick={() => setConfirm("cancelado")}
                  >
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
                    {i.image ? (
                      <AsciiImage src={i.image} alt="" />
                    ) : (
                      <Icon name="tag" />
                    )}
                  </span>
                  <span className="t">
                    <b>
                      <Link href={`/admin/loja/${i.productId}`}>{i.title}</Link>
                    </b>
                    <span>
                      {i.label || "Variante única"} ·{" "}
                      <span className="mono">{i.sku}</span>
                    </span>
                  </span>
                  <span className="muted">
                    {i.qty} × {brl(i.priceCents)}
                  </span>
                  <b style={{ minWidth: 92, textAlign: "right" }}>
                    {brl(i.qty * i.priceCents)}
                  </b>
                </li>
              ))}
            </ul>
            <dl className="ord-tot">
              <div>
                <dt>Subtotal</dt>
                <dd>{brl(o.subtotalCents)}</dd>
              </div>
              {(o.discountCents ?? 0) > 0 && (
                <div>
                  <dt>Desconto{o.coupon?.code ? ` · ${o.coupon.code}` : ""}</dt>
                  <dd>− {brl(o.discountCents ?? 0)}</dd>
                </div>
              )}
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
              <label className="f">
                Anotação interna
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Somente a equipe vê esta anotação…"
                  rows={2}
                />
              </label>
              <div className="row">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!note.trim() || addNote.isPending}
                  onClick={() => addNote.mutate()}
                >
                  Anotar
                </Button>
              </div>
            </div>
            <ul className="lst log">
              {[...o.timeline].reverse().map((e, i) => (
                <li key={i}>
                  <Icon
                    name={
                      e.status === "nota"
                        ? "pen"
                        : e.status === "cancelado"
                          ? "x"
                          : "check"
                    }
                  />
                  <span className="t">
                    <b>
                      {e.status === "criado"
                        ? "Pedido feito"
                        : e.status === "nota"
                          ? "Anotação"
                          : ORDER_STATUS_LABEL[e.status]}
                    </b>
                    {e.note && (
                      <span style={{ whiteSpace: "normal" }}>{e.note}</span>
                    )}
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
                  <a
                    href={waNumberLink(
                      o.phone,
                      `Olá, ${o.name.split(" ")[0]}! Aqui é da Brasília Iluminação, sobre o seu pedido nº ${o.number}.`,
                    )}
                    target="_blank"
                    rel="noopener"
                  >
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
                {o.shipping.address.complement &&
                  ` · ${o.shipping.address.complement}`}
                <br />
                {o.shipping.address.district} · {o.shipping.address.city}/
                {o.shipping.address.uf} · {formatCep(o.shipping.address.cep)}
              </p>
            ) : (
              <p>Combinar local e horário com o cliente.</p>
            )}
            <p className="muted">
              {o.shipping.label} · {o.shipping.days} ·{" "}
              {o.shippingCents ? brl(o.shippingCents) : "grátis"}
            </p>
            {o.tracking && (
              <p>
                Rastreio <span className="mono">{o.tracking}</span>
              </p>
            )}
            {o.notes && (
              <p className="hint">Observação do cliente: {o.notes}</p>
            )}
          </div>
          <div className="card pad stack ord-kv">
            <b>Pagamento</b>
            {p ? (
              <>
                <p>
                  {p.method === "pix"
                    ? "Pix"
                    : `Cartão ${p.brand ?? ""} final ${p.last4} · ${p.installments && p.installments > 1 ? `${p.installments}x` : "à vista"}`}
                  <br />
                  <span className="muted">
                    {p.status === "aprovado"
                      ? `Aprovado${p.paidAt ? ` ${fmt(p.paidAt)}` : ""}`
                      : p.status === "estornado"
                        ? "Estornado"
                        : p.status === "recusado"
                          ? `Recusado${p.message ? `: ${p.message}` : ""}`
                          : "Aguardando"}
                  </span>
                </p>
                <p className="muted">
                  {p.provider === "simulado"
                    ? "Pagamento simulado (modo demonstração)"
                    : p.provider}{" "}
                  · <span className="mono">{p.chargeId}</span>
                </p>
              </>
            ) : (
              <p className="muted">Sem cobrança gerada.</p>
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={confirm != null}
        onOpenChange={(v) => !v && setConfirm(null)}
      >
        <AlertDialogContent className="adm admin-popover rounded-2xl p-5">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[20px] font-semibold leading-tight tracking-tight">
              {confirm === "cancelado"
                ? `Cancelar o pedido nº ${o.number}?`
                : `Confirmar o pagamento do pedido nº ${o.number}?`}
            </AlertDialogTitle>
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
            <AlertDialogAction onClick={() => confirm && move.mutate(confirm)}>
              {confirm === "cancelado"
                ? "Cancelar pedido"
                : "Confirmar pagamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
