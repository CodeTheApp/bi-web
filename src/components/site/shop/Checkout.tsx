"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { brl, type CategorySlug } from "@/lib/catalog/types";
import { onlyDigits, type Address, type PaymentMethod, type ShippingChoice } from "@/lib/shop/types";
import { placeOrder, quoteCart, saveProfile, shippingOptions } from "@/server/shop/actions";
import { ProductArt } from "../loja/ProductArt";
import { AddressForm, addressLine, cardInput, CardFields, checkAddress, checkCard, emptyAddress, emptyCard, type AddressDraft, type CardDraft, type Errors } from "./forms";
import { I } from "./icons";
import { cepStore } from "./local";
import { LoginForm } from "./LoginForm";
import { useShop } from "./ShopProvider";

type Quote = Extract<Awaited<ReturnType<typeof quoteCart>>, { ok: true }>["data"];
type Step = 1 | 2 | 3;
const PICKUP: ShippingChoice = { id: "retirada", label: "Retirar em Brasília", days: "Pronto em 1 dia útil", priceCents: 0 };
const formatPhone = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  return d.length > 10 ? d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => (b ? `(${a}) ${b}${c ? `-${c}` : ""}` : a));
};
const formatCpf = (s: string) =>
  onlyDigits(s)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");

/**
 * Checkout em três passos (dados, entrega, pagamento) com o resumo ao lado.
 * Preço, frete e total são recalculados no servidor na hora de fechar o pedido.
 */
export function Checkout() {
  const shop = useShop();
  const router = useRouter();
  const c = shop.customer;
  const lines = shop.items.map((i) => ({ variantId: i.variantId, qty: i.qty }));
  const linesKey = lines.map((l) => `${l.variantId}x${l.qty}`).join(",");

  // passo aberto: o escolhido, ou o primeiro que falta
  const [stepSel, setStep] = useState<Step | null>(null);
  const step: Step = stepSel ?? (c && c.name && onlyDigits(c.phone).length >= 10 ? 2 : 1);

  /* dados */
  const [profileEdit, setProfile] = useState<{ name: string; phone: string; cpf: string } | null>(null);
  const profile = profileEdit ?? { name: c?.name ?? "", phone: c?.phone ?? "", cpf: c?.cpf ?? "" };
  const [profileErr, setProfileErr] = useState<Errors<"name" | "phone">>({});

  /* entrega */
  const [mode, setMode] = useState<"entrega" | "retirada">("entrega");
  const [addrSel, setAddrSel] = useState<string | null>(null);
  const addrId = addrSel ?? c?.addresses[0]?.id ?? "";
  const saved = c?.addresses.find((a) => a.id === addrId) ?? null;
  const lastCep = cepStore.use();
  const [draft, setDraft] = useState<AddressDraft>(() => emptyAddress());
  const draftCep = draft.cep || lastCep;
  const [addrErr, setAddrErr] = useState<Errors<keyof AddressDraft>>({});
  const cep = onlyDigits(saved ? saved.cep : draftCep);

  const [shipResult, setShipResult] = useState<{ key: string; opts: ShippingChoice[] } | null>(null);
  const shipKey = `${cep}|${linesKey}`;
  const opts = shipResult?.key === shipKey ? shipResult.opts.filter((o) => o.id !== "retirada") : null;
  const [shipSel, setShipSel] = useState<string | null>(null);
  const ship = mode === "retirada" ? PICKUP : (opts?.find((o) => o.id === shipSel) ?? opts?.[0] ?? null);

  /* pagamento */
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [card, setCard] = useState<CardDraft>(emptyCard);
  const [cardErr, setCardErr] = useState<Errors<keyof CardDraft>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [placed, setPlaced] = useState(false);

  /* conferência da sacola */
  const [quoteResult, setQuote] = useState<{ key: string; q: Quote } | null>(null);
  const quote = quoteResult?.key === linesKey ? quoteResult.q : null;
  useEffect(() => {
    if (!linesKey) return;
    let alive = true;
    const ls = linesKey.split(",").map((s) => {
      const [variantId, qty] = s.split("x");
      return { variantId, qty: Number(qty) };
    });
    quoteCart(ls).then((r) => alive && r.ok && setQuote({ key: linesKey, q: r.data }));
    return () => {
      alive = false;
    };
  }, [linesKey]);

  // frete: quando o CEP fica completo ou a sacola muda
  useEffect(() => {
    if (cep.length !== 8 || !linesKey) return;
    let alive = true;
    const t = setTimeout(() => {
      const ls = linesKey.split(",").map((s) => {
        const [variantId, qty] = s.split("x");
        return { variantId, qty: Number(qty) };
      });
      shippingOptions(cep, ls).then((r) => alive && r.ok && setShipResult({ key: `${cep}|${linesKey}`, opts: r.data }));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [cep, linesKey]);

  const byId = new Map(quote?.lines.map((l) => [l.variantId, l]));
  const blocked = shop.items.filter((i) => byId.get(i.variantId)?.available === false);
  const subtotal = quote ? quote.subtotal : shop.subtotal;
  const shipping = ship?.priceCents ?? 0;
  const total = subtotal + shipping;

  const addressForOrder = (): { ok: true; address: Address | null } | { ok: false } => {
    if (mode === "retirada") return { ok: true, address: null };
    if (saved) return { ok: true, address: saved };
    const r = checkAddress({ ...draft, cep: draftCep, recipient: draft.recipient || profile.name });
    if (!r.ok) {
      setAddrErr(r.errors);
      return { ok: false };
    }
    setAddrErr({});
    return { ok: true, address: r.address };
  };

  const doneProfile = async () => {
    const e: Errors<"name" | "phone"> = {};
    if (profile.name.trim().length < 2) e.name = "Informe seu nome completo.";
    if (onlyDigits(profile.phone).length < 10) e.phone = "Informe um celular com DDD.";
    setProfileErr(e);
    if (Object.keys(e).length) return;
    if (c && (c.name !== profile.name.trim() || c.phone !== profile.phone || c.cpf !== profile.cpf)) {
      setBusy(true);
      const r = await saveProfile(profile);
      setBusy(false);
      if (!r.ok) return setProfileErr({ name: r.error });
      shop.setCustomer(r.data);
    }
    setStep(2);
  };

  const doneShipping = () => {
    if (!addressForOrder().ok) return;
    if (!ship) return setErr("Escolha a forma de entrega.");
    setErr("");
    setStep(3);
  };

  const finish = async () => {
    setErr("");
    const a = addressForOrder();
    if (!a.ok) return setStep(2);
    if (!ship) return setStep(2);
    if (method === "cartao") {
      const e = checkCard(card);
      setCardErr(e);
      if (Object.keys(e).length) return;
    }
    setBusy(true);
    const r = await placeOrder({
      items: lines,
      address: a.address,
      shippingId: ship.id,
      method,
      card: method === "cartao" ? cardInput({ ...card, installments: Math.min(card.installments, 10) }) : undefined,
      notes,
    });
    if (!r.ok) {
      setBusy(false);
      return setErr(r.error);
    }
    setPlaced(true);
    shop.clear();
    router.push(`/loja/pedido/${r.data.id}`);
  };

  if (placed)
    return (
      <div className="co-wait">
        <span className="cart-glow" aria-hidden="true">
          <I n="check" size={30} />
        </span>
        <p>Abrindo o seu pedido…</p>
      </div>
    );

  if (shop.ready && !shop.items.length)
    return (
      <div className="page-empty">
        <p className="t">Sua sacola está vazia</p>
        <p>Escolha as peças na loja e volte aqui para finalizar.</p>
        <a className="sbtn amber" href="/loja">
          Ver a loja
        </a>
      </div>
    );

  return (
    <div className="co">
      <div className="co-main">
        <header className="co-head">
          <h1>Finalizar compra</h1>
          {shop.demo && <span className="demo-tag">Modo demonstração · nada é cobrado</span>}
        </header>

        {/* 1. dados */}
        <section className={`co-step${step === 1 ? " open" : ""}${step > 1 ? " done" : ""}`}>
          <div className="co-step-h">
            <span className="n">{step > 1 ? <I n="check" size={14} /> : 1}</span>
            <h2>Seus dados</h2>
            {step > 1 && (
              <button type="button" className="tlink" onClick={() => setStep(1)}>
                Alterar
              </button>
            )}
          </div>
          {step === 1 ? (
            !shop.loaded ? (
              <div className="skel" style={{ height: 180 }} />
            ) : !c ? (
              <div className="co-login">
                <LoginForm title="Entre para continuar" reason="Usamos o seu e-mail para mandar a confirmação e o andamento do pedido. Não tem senha: chega um código." />
              </div>
            ) : (
              <div className="co-body">
                <p className="co-who">
                  {c.email}{" "}
                  <button type="button" className="tlink" onClick={() => shop.signOut()}>
                    Não é você?
                  </button>
                </p>
                <div className="co-grid">
                  <label className={`field span2${profileErr.name ? " bad" : ""}`}>
                    <span>Nome completo</span>
                    <input autoComplete="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                    {profileErr.name && <small className="ferr">{profileErr.name}</small>}
                  </label>
                  <label className={`field${profileErr.phone ? " bad" : ""}`}>
                    <span>Celular com DDD</span>
                    <input
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="(61) 99999-9999"
                      value={formatPhone(profile.phone)}
                      onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })}
                    />
                    {profileErr.phone && <small className="ferr">{profileErr.phone}</small>}
                  </label>
                  <label className="field">
                    <span>CPF (para a nota fiscal)</span>
                    <input inputMode="numeric" placeholder="000.000.000-00" value={formatCpf(profile.cpf)} onChange={(e) => setProfile({ ...profile, cpf: formatCpf(e.target.value) })} />
                  </label>
                </div>
                <button type="button" className="sbtn" onClick={doneProfile} disabled={busy}>
                  Continuar para a entrega
                </button>
              </div>
            )
          ) : (
            c && (
              <p className="co-sum">
                {c.name} · {c.email} · {formatPhone(c.phone)}
              </p>
            )
          )}
        </section>

        {/* 2. entrega */}
        <section className={`co-step${step === 2 ? " open" : ""}${step > 2 ? " done" : ""}${step < 2 ? " later" : ""}`}>
          <div className="co-step-h">
            <span className="n">{step > 2 ? <I n="check" size={14} /> : 2}</span>
            <h2>Entrega</h2>
            {step > 2 && (
              <button type="button" className="tlink" onClick={() => setStep(2)}>
                Alterar
              </button>
            )}
          </div>
          {step === 2 && c && (
            <div className="co-body">
              <div className="seg" role="radiogroup" aria-label="Como receber">
                <button type="button" role="radio" aria-checked={mode === "entrega"} className={mode === "entrega" ? "on" : ""} onClick={() => setMode("entrega")}>
                  <I n="truck" size={18} /> Receber no endereço
                </button>
                <button type="button" role="radio" aria-checked={mode === "retirada"} className={mode === "retirada" ? "on" : ""} onClick={() => setMode("retirada")}>
                  <I n="bag" size={18} /> Retirar em Brasília
                </button>
              </div>

              {mode === "retirada" ? (
                <div className="co-pickup">
                  <p>
                    <b>Retirada grátis em Brasília</b>, pronta em 1 dia útil. Quando o pedido estiver separado, combinamos o local e o horário pelo WhatsApp.
                  </p>
                </div>
              ) : (
                <>
                  {c.addresses.length > 0 && (
                    <div className="opts" role="radiogroup" aria-label="Endereço">
                      {c.addresses.map((a) => (
                        <label key={a.id} className={`opt-card${addrId === a.id ? " on" : ""}`}>
                          <input type="radio" name="addr" checked={addrId === a.id} onChange={() => setAddrSel(a.id)} />
                          <span>
                            <b>{a.recipient}</b>
                            <small>{addressLine(a)}</small>
                          </span>
                        </label>
                      ))}
                      <label className={`opt-card${addrId === "" ? " on" : ""}`}>
                        <input type="radio" name="addr" checked={addrId === ""} onChange={() => setAddrSel("")} />
                        <span>
                          <b>Outro endereço</b>
                        </span>
                      </label>
                    </div>
                  )}
                  {addrId === "" && <AddressForm value={{ ...draft, cep: draftCep }} set={setDraft} errors={addrErr} recipientHint={profile.name} />}

                  <div className="co-ship">
                    <h3>Forma de entrega</h3>
                    {cep.length !== 8 ? (
                      <p className="muted">Informe o CEP para ver as opções e os prazos.</p>
                    ) : !opts ? (
                      <div className="skel" style={{ height: 112 }} />
                    ) : (
                      <div className="opts" role="radiogroup" aria-label="Forma de entrega">
                        {opts.map((o) => (
                          <label key={o.id} className={`opt-card row${ship?.id === o.id ? " on" : ""}`}>
                            <input type="radio" name="ship" checked={ship?.id === o.id} onChange={() => setShipSel(o.id)} />
                            <span>
                              <b>{o.label}</b>
                              <small>{o.days}</small>
                            </span>
                            <em className={o.priceCents ? "" : "free"}>{o.priceCents ? brl(o.priceCents) : "Grátis"}</em>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
              {err && step === 2 && (
                <p className="ferr" role="alert">
                  {err}
                </p>
              )}
              <button type="button" className="sbtn" onClick={doneShipping} disabled={mode === "entrega" && !ship}>
                Continuar para o pagamento
              </button>
            </div>
          )}
          {step > 2 && (
            <p className="co-sum">
              {mode === "retirada"
                ? "Retirar em Brasília · grátis"
                : `${saved ? addressLine(saved) : addressLine({ ...draft, cep: draftCep })} · ${ship?.label} (${ship?.priceCents ? brl(ship.priceCents) : "grátis"})`}
            </p>
          )}
        </section>

        {/* 3. pagamento */}
        <section className={`co-step${step === 3 ? " open" : ""}${step < 3 ? " later" : ""}`}>
          <div className="co-step-h">
            <span className="n">3</span>
            <h2>Pagamento</h2>
          </div>
          {step === 3 && (
            <div className="co-body">
              <div className="seg" role="radiogroup" aria-label="Forma de pagamento">
                <button type="button" role="radio" aria-checked={method === "pix"} className={method === "pix" ? "on" : ""} onClick={() => setMethod("pix")}>
                  <I n="pix" size={18} /> Pix
                </button>
                <button type="button" role="radio" aria-checked={method === "cartao"} className={method === "cartao" ? "on" : ""} onClick={() => setMethod("cartao")}>
                  <I n="card" size={18} /> Cartão de crédito
                </button>
              </div>
              {method === "pix" ? (
                <p className="co-pix">O código Pix aparece assim que você confirmar. Ele vale por 30 minutos e a aprovação sai na hora.</p>
              ) : (
                <>
                  <CardFields value={card} set={setCard} total={total} errors={cardErr} />
                  {shop.demo && (
                    <div className="demo-box col">
                      Modo demonstração: nada é cobrado e o número do cartão não sai do seu navegador. Use qualquer número; terminado em <b>0002</b> simula um cartão recusado.
                    </div>
                  )}
                </>
              )}
              <label className="field">
                <span>Observações para a entrega (opcional)</span>
                <textarea value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: portaria fecha às 18h" />
              </label>
              {err && (
                <p className="ferr" role="alert">
                  {err}
                </p>
              )}
              <button type="button" className="sbtn amber wide big" onClick={finish} disabled={busy || blocked.length > 0}>
                {busy ? "Finalizando…" : method === "pix" ? `Gerar Pix de ${brl(total)}` : `Pagar ${brl(total)}`}
              </button>
              <p className="co-safe">
                <I n="lock" size={15} /> O total é conferido de novo no fechamento, com o preço e o estoque de agora.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* resumo */}
      <aside className="co-side" aria-label="Resumo do pedido">
        <div className="co-card">
          <div className="co-card-h">
            <h2>Resumo</h2>
            <button type="button" className="tlink" onClick={shop.openCart}>
              Editar sacola
            </button>
          </div>
          <ul className="co-items">
            {shop.items.map((i) => {
              const q = byId.get(i.variantId);
              const out = q?.available === false;
              return (
                <li key={i.variantId} className={out ? "out" : undefined}>
                  <span className="ci-img">
                    {i.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.image} alt="" />
                    ) : (
                      <ProductArt category={i.category as CategorySlug} className="pa" />
                    )}
                    <b>{i.qty}</b>
                  </span>
                  <span className="ci-t">
                    {i.title}
                    {i.label && <small>{i.label}</small>}
                    {out && (
                      <small className="ferr">
                        {q?.reason}.{" "}
                        <button type="button" className="tlink" onClick={() => shop.remove(i.variantId)}>
                          Tirar
                        </button>
                      </small>
                    )}
                  </span>
                  <span className="ci-p">{brl((q?.priceCents ?? i.priceCents ?? 0) * i.qty)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="co-tot">
            <div>
              <dt>Subtotal</dt>
              <dd>{brl(subtotal)}</dd>
            </div>
            <div>
              <dt>Entrega</dt>
              <dd>{ship ? (ship.priceCents ? brl(ship.priceCents) : "Grátis") : "—"}</dd>
            </div>
            <div className="big">
              <dt>Total</dt>
              <dd>{brl(total)}</dd>
            </div>
          </dl>
        </div>
      </aside>
    </div>
  );
}
