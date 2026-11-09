"use client";
import { useCallback, useEffect, useState } from "react";
import { brl, type CategorySlug } from "@/lib/catalog/types";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus, type PaymentMethod } from "@/lib/shop/types";
import { myOrder, retryPayment, simulatePixPaid } from "@/server/shop/actions";
import { ProductArt } from "../loja/ProductArt";
import { addressLine, cardInput, CardFields, checkCard, emptyCard, type CardDraft, type Errors } from "./forms";
import { I } from "./icons";
import { useHydrated } from "./local";
import { LoginForm } from "./LoginForm";
import { useShop } from "./ShopProvider";

const TZ = "America/Sao_Paulo";
export const fmtDate = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : null) });
const PAID: OrderStatus[] = ["pago", "em_separacao", "enviado", "entregue"];
const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";

/** Etapas mostradas ao cliente; na retirada, "enviado" vira "pronto para retirar". */
function stagesFor(o: Order) {
  const pickup = o.shipping.id === "retirada";
  return [
    { s: "aguardando_pagamento", label: "Pedido feito" },
    { s: "pago", label: "Pagamento aprovado" },
    { s: "em_separacao", label: "Em separação" },
    { s: "enviado", label: pickup ? "Pronto para retirar" : "Enviado" },
    { s: "entregue", label: pickup ? "Retirado" : "Entregue" },
  ] as const;
}
export function statusLabel(o: Pick<Order, "status"> & { shipping?: { id: string } }) {
  if (o.shipping?.id === "retirada" && o.status === "enviado") return "Pronto para retirar";
  if (o.shipping?.id === "retirada" && o.status === "entregue") return "Retirado";
  return ORDER_STATUS_LABEL[o.status];
}

/** Página do pedido: confirmação, Pix para pagar, nova tentativa no cartão e o andamento. */
export function OrderView({ id, initial }: { id: string; initial: Order | null }) {
  const shop = useShop();
  const [order, setOrder] = useState(initial);
  const refresh = useCallback(async () => {
    const r = await myOrder(id);
    if (r.ok && r.data) setOrder(r.data);
  }, [id]);

  const waitingPix = order?.status === "aguardando_pagamento" && order.payment?.method === "pix" && order.payment.status === "pendente";
  useEffect(() => {
    if (!waitingPix) return;
    const t = setInterval(refresh, 5000);
    return () => clearInterval(t);
  }, [waitingPix, refresh]);
  if (!order)
    return !shop.loaded ? (
      <div className="skel" style={{ height: 320 }} />
    ) : shop.customer ? (
      <div className="page-empty">
        <p className="t">Pedido não encontrado</p>
        <p>Ele pode ser de outra conta. Veja os seus pedidos em Minha conta.</p>
        <a className="sbtn" href="/conta">
          Minha conta
        </a>
      </div>
    ) : (
      <div className="co-login narrow">
        <LoginForm title="Entre para ver o pedido" reason="Use o mesmo e-mail com que você fez a compra." onDone={() => refresh()} />
      </div>
    );

  const paid = PAID.includes(order.status);
  const refused = order.status === "aguardando_pagamento" && order.payment?.status === "recusado";
  const stages = stagesFor(order);
  const at = stages.findIndex((s) => s.s === order.status);
  const p = order.payment;

  return (
    <div className="ord">
      <header className={`ord-hero${paid ? " lit" : ""}${order.status === "cancelado" ? " off" : ""}`}>
        <span className="ord-orb" aria-hidden="true">
          <I n={paid ? "check" : order.status === "cancelado" ? "minus" : p?.method === "cartao" ? "card" : "pix"} size={28} />
        </span>
        <div>
          <span className="pcat">
            Pedido nº {order.number} · {fmtDate(order.createdAt)}
          </span>
          <h1>
            {paid ? (order.status === "pago" ? "Pedido confirmado" : statusLabel(order)) : order.status === "cancelado" ? "Pedido cancelado" : refused ? "Pagamento não aprovado" : "Falta pagar o Pix"}
          </h1>
          <p>
            {paid
              ? `Obrigado, ${firstName(order.name)}! A confirmação vai para ${order.email}${shop.demo ? " (no modo demonstração nenhum e-mail é enviado)" : ""}. Você acompanha tudo por aqui.`
              : order.status === "cancelado"
                ? "Se o pagamento tinha sido aprovado, o valor volta pela mesma forma de pagamento."
                : refused
                  ? `${p?.message ?? "O cartão não foi aprovado."} Tente outro cartão ou pague com Pix: o pedido continua reservado.`
                  : "Pague pelo app do seu banco com o QR ou o código abaixo. A confirmação aparece aqui sozinha."}
          </p>
        </div>
      </header>

      {waitingPix && <PixPanel order={order} onChange={refresh} />}
      {refused && <RetryPanel order={order} onChange={refresh} />}

      {order.status !== "cancelado" && (
        <ol className="ord-track" aria-label="Andamento">
          {stages.map((s, i) => (
            <li key={s.s} className={i < at ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}>
              <i aria-hidden="true">{i < at || (i === at && i > 0) ? <I n="check" size={12} /> : null}</i>
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="ord-grid">
        <section className="co-card">
          <div className="co-card-h">
            <h2>Peças</h2>
          </div>
          <ul className="co-items">
            {order.items.map((i) => (
              <li key={i.variantId}>
                <a className="ci-img" href={`/loja/${i.slug}`}>
                  {i.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" />
                  ) : (
                    <ProductArt category={i.category as CategorySlug} className="pa" />
                  )}
                  <b>{i.qty}</b>
                </a>
                <span className="ci-t">
                  {i.title}
                  {i.label && <small>{i.label}</small>}
                  <small>SKU {i.sku}</small>
                </span>
                <span className="ci-p">{brl(i.priceCents * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="co-tot">
            <div>
              <dt>Subtotal</dt>
              <dd>{brl(order.subtotalCents)}</dd>
            </div>
            <div>
              <dt>{order.shipping.label}</dt>
              <dd>{order.shippingCents ? brl(order.shippingCents) : "Grátis"}</dd>
            </div>
            <div className="big">
              <dt>Total</dt>
              <dd>{brl(order.totalCents)}</dd>
            </div>
          </dl>
        </section>

        <div className="ord-side">
          <section className="co-card">
            <h2>{order.shipping.id === "retirada" ? "Retirada" : "Entrega"}</h2>
            {order.shipping.address ? (
              <p>
                <b>{order.shipping.address.recipient}</b>
                <br />
                {addressLine(order.shipping.address)}
              </p>
            ) : (
              <p>Em Brasília. Quando estiver pronto, combinamos o local e o horário pelo WhatsApp {order.phone ? `(${order.phone})` : ""}.</p>
            )}
            <p className="muted">
              {order.shipping.label} · {order.shipping.days}
            </p>
            {order.tracking && (
              <p className="ord-tracking">
                Código de rastreio <b className="mono">{order.tracking}</b>
              </p>
            )}
            {order.notes && <p className="muted">Observação: {order.notes}</p>}
          </section>
          {p && (
            <section className="co-card">
              <h2>Pagamento</h2>
              <p>
                {p.method === "pix"
                  ? "Pix"
                  : `Cartão ${p.brand ?? ""} final ${p.last4}${p.installments && p.installments > 1 ? ` · ${p.installments}x de ${brl(Math.ceil(order.totalCents / p.installments))}` : " · à vista"}`}
              </p>
              <p className="muted">
                {p.status === "aprovado" ? `Aprovado${p.paidAt ? ` em ${fmtDate(p.paidAt)}` : ""}` : p.status === "estornado" ? "Estornado" : p.status === "recusado" ? "Recusado" : "Aguardando"}
              </p>
            </section>
          )}
          <section className="co-card">
            <h2>Histórico</h2>
            <ol className="ord-log">
              {[...order.timeline].reverse().map((e, i) => (
                <li key={i}>
                  <b>{e.status === "criado" ? "Pedido feito" : e.status === "nota" ? e.note : statusLabel({ status: e.status, shipping: order.shipping })}</b>
                  {e.status !== "nota" && e.note && <span>{e.note}</span>}
                  <small>{fmtDate(e.at)}</small>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="ord-acts">
        <a className="sbtn line" href="/conta">
          Meus pedidos
        </a>
        <a className="tlink" href="/loja">
          Voltar para a loja
        </a>
      </div>
    </div>
  );
}

/* ---------------- Pix ---------------- */

/** Desenho de QR só para a demonstração (não é um QR de verdade): padrão fixo a partir do código. */
function FakeQr({ code }: { code: string }) {
  const n = 29;
  let h = 2166136261;
  const bits: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h ^= code.charCodeAt(i % code.length) + i;
    h = Math.imul(h, 16777619) >>> 0;
    bits.push((h & 7) < 3);
  }
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ]) {
      if (inBox(ox, oy)) {
        const dx = x - ox,
          dy = y - oy;
        return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4) ? 1 : 0;
      }
      if (x >= ox - 1 && x <= ox + 7 && y >= oy - 1 && y <= oy + 7) return 0;
    }
    return -1;
  };
  const cells: string[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      if (f === 1 || (f === -1 && bits[y * n + x])) cells.push(`M${x} ${y}h1v1h-1z`);
    }
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="qr" role="img" aria-label="QR Code do Pix (demonstração)">
      <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
      <path d={cells.join("")} fill="#291007" />
    </svg>
  );
}

function PixPanel({ order, onChange }: { order: Order; onChange: () => Promise<void> }) {
  const shop = useShop();
  const hydrated = useHydrated();
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = order.payment!;
  const left = p.expiresAt ? Math.max(0, new Date(p.expiresAt).getTime() - now) : 0;
  const expired = hydrated && !!p.expiresAt && left === 0;
  const mmss = `${String(Math.floor(left / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`;

  const act = async (kind: "novo" | "simular") => {
    setBusy(kind);
    setErr("");
    const r = kind === "novo" ? await retryPayment(order.id, "pix") : await simulatePixPaid(order.id);
    if (!r.ok) setErr(r.error);
    await onChange();
    setBusy("");
  };

  return (
    <section className="pix">
      <div className="pix-qr">{expired ? <div className="qr off">Expirado</div> : <FakeQr code={p.pixCode ?? order.id} />}</div>
      <div className="pix-info">
        <p className="pix-total">
          <span>Total</span> <b>{brl(order.totalCents)}</b>
        </p>
        {expired ? (
          <p className="muted">Este código expirou. Gere outro: o pedido e os preços continuam os mesmos.</p>
        ) : (
          <p className="muted">{hydrated ? `Vale por mais ${mmss}.` : "Vale por 30 minutos."} Abra o app do banco, escolha Pix e leia o QR ou cole o código.</p>
        )}
        {!expired && (
          <div className="pix-code">
            <code>{p.pixCode}</code>
            <button
              type="button"
              className="sbtn sm"
              onClick={() =>
                navigator.clipboard?.writeText(p.pixCode ?? "").then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                })
              }
            >
              {copied ? "Copiado" : "Copiar código"}
            </button>
          </div>
        )}
        {err && <p className="ferr">{err}</p>}
        <div className="pix-acts">
          {expired && (
            <button type="button" className="sbtn amber" onClick={() => act("novo")} disabled={!!busy}>
              {busy === "novo" ? "Gerando…" : "Gerar novo Pix"}
            </button>
          )}
          {shop.demo && !expired && (
            <button type="button" className="sbtn amber" onClick={() => act("simular")} disabled={!!busy}>
              {busy === "simular" ? "Confirmando…" : "Simular pagamento aprovado"}
            </button>
          )}
        </div>
        {shop.demo && <p className="demo-note left">Modo demonstração: o QR e o código são de mentira. O botão acima faz de conta que o banco confirmou.</p>}
      </div>
    </section>
  );
}

/* ---------------- nova tentativa ---------------- */
function RetryPanel({ order, onChange }: { order: Order; onChange: () => Promise<void> }) {
  const shop = useShop();
  const [method, setMethod] = useState<PaymentMethod>("cartao");
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [errors, setErrors] = useState<Errors<keyof CardDraft>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async () => {
    setErr("");
    if (method === "cartao") {
      const e = checkCard(card);
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setBusy(true);
    const r = await retryPayment(order.id, method, method === "cartao" ? cardInput(card) : undefined);
    if (!r.ok) setErr(r.error);
    else if (r.data.payment?.status === "recusado") setErr(r.data.payment.message ?? "O cartão não foi aprovado.");
    await onChange();
    setBusy(false);
  };
  return (
    <section className="retry co-card">
      <h2>Tentar de novo</h2>
      <div className="seg" role="radiogroup" aria-label="Forma de pagamento">
        <button type="button" role="radio" aria-checked={method === "cartao"} className={method === "cartao" ? "on" : ""} onClick={() => setMethod("cartao")}>
          <I n="card" size={18} /> Outro cartão
        </button>
        <button type="button" role="radio" aria-checked={method === "pix"} className={method === "pix" ? "on" : ""} onClick={() => setMethod("pix")}>
          <I n="pix" size={18} /> Pix
        </button>
      </div>
      {method === "cartao" && <CardFields value={card} set={setCard} total={order.totalCents} errors={errors} />}
      {method === "cartao" && shop.demo && <div className="demo-box col">Modo demonstração: qualquer número que não termine em 0002 é aprovado.</div>}
      {err && (
        <p className="ferr" role="alert">
          {err}
        </p>
      )}
      <button type="button" className="sbtn amber" onClick={go} disabled={busy}>
        {busy ? "Enviando…" : method === "pix" ? `Gerar Pix de ${brl(order.totalCents)}` : `Pagar ${brl(order.totalCents)}`}
      </button>
    </section>
  );
}
