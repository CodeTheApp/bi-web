"use client";
import { useEffect, useState } from "react";
import { brl } from "@/entities/product";
import { onlyDigits, type OrderSummary } from "@/entities/order";
import { myOrders, removeAddress, saveAddress, saveProfile } from "@/server/shop/actions";
import { AddressForm, addressLine, checkAddress, emptyAddress, type AddressDraft, type Errors } from "@/features/shopping/ui/forms";
import { I } from "@/features/shopping/ui/icons";
import { LoginForm } from "@/features/shopping/ui/LoginForm";
import { fmtDate, statusLabel } from "@/features/shopping/ui/OrderView";
import { useShop } from "@/features/shopping/model/ShopProvider";

type Tab = "pedidos" | "dados" | "enderecos";
const TABS: Array<[Tab, string]> = [
  ["pedidos", "Pedidos"],
  ["dados", "Meus dados"],
  ["enderecos", "Endereços"],
];
const fromHash = (): Tab => {
  if (typeof window === "undefined") return "pedidos";
  const h = window.location.hash.slice(1);
  return TABS.some(([t]) => t === h) ? (h as Tab) : "pedidos";
};
const formatPhone = (s: string) => {
  const d = onlyDigits(s).slice(0, 11);
  return d.length > 10 ? d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3") : d.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => (b ? `(${a}) ${b}${c ? `-${c}` : ""}` : a));
};

/** Minha conta: pedidos, dados e endereços. Sem login, mostra o formulário de entrar aqui mesmo. */
export function Account() {
  const shop = useShop();
  const c = shop.customer;
  const [tab, setTab] = useState<Tab>(fromHash);
  const loginError = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("erro") === "login";

  if (!shop.loaded) return <div className="skel" style={{ height: 360 }} />;
  if (!c)
    return (
      <div className="co-login narrow">
        {loginError && (
          <p className="ferr" role="alert">
            Não foi possível entrar com o Google. Tente de novo ou use o código por e-mail.
          </p>
        )}
        <LoginForm title="Minha conta" />
      </div>
    );

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#${t}`);
  };

  return (
    <div className="acc">
      <header className="page-head">
        <div>
          <span className="pcat">Minha conta</span>
          <h1>Olá{c.name ? `, ${c.name.trim().split(/\s+/)[0]}` : ""}</h1>
          <p>
            {c.email}
            {c.provider === "google" ? " · entrou com Google" : ""}
          </p>
        </div>
        <button type="button" className="sbtn line sm" onClick={() => shop.signOut()}>
          Sair
        </button>
      </header>

      <nav className="acc-tabs" role="tablist" aria-label="Seções da conta">
        {TABS.map(([t, label]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => go(t)}>
            {label}
          </button>
        ))}
        <a href="/loja/favoritos" className="acc-fav">
          <I n="heart" size={16} /> Favoritos{shop.favorites.length ? ` (${shop.favorites.length})` : ""}
        </a>
      </nav>

      <div className="acc-body" role="tabpanel">
        {tab === "pedidos" && <Orders />}
        {tab === "dados" && <ProfileForm />}
        {tab === "enderecos" && <Addresses />}
      </div>
    </div>
  );
}

function Orders() {
  const [list, setList] = useState<OrderSummary[] | null>(null);
  useEffect(() => {
    let alive = true;
    myOrders().then((r) => alive && setList(r.ok ? r.data : []));
    return () => {
      alive = false;
    };
  }, []);
  if (!list) return <div className="skel" style={{ height: 180 }} />;
  if (!list.length)
    return (
      <div className="page-empty">
        <p className="t">Nenhum pedido ainda</p>
        <p>Quando você comprar, o pedido aparece aqui com o andamento da entrega.</p>
        <a className="sbtn amber" href="/loja">
          Ver a loja
        </a>
      </div>
    );
  return (
    <ul className="acc-orders">
      {list.map((o) => (
        <li key={o.id}>
          <a href={`/loja/pedido/${o.id}`}>
            <span className="ao-n">
              Pedido nº {o.number}
              <small>{fmtDate(o.createdAt, false)}</small>
            </span>
            <span className="ao-i">
              {o.items} {o.items === 1 ? "peça" : "peças"} · {o.method === "pix" ? "Pix" : o.method === "cartao" ? "Cartão" : "—"}
            </span>
            <span className={`st st-${o.status}`}>{statusLabel(o)}</span>
            <b className="ao-t">{brl(o.totalCents)}</b>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ProfileForm() {
  const shop = useShop();
  const c = shop.customer!;
  const [v, setV] = useState({ name: c.name, phone: c.phone, cpf: c.cpf });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const r = await saveProfile(v);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    shop.setCustomer(r.data);
    shop.say("Dados salvos");
  };
  return (
    <form className="acc-form" onSubmit={save}>
      <div className="co-grid">
        <label className="field span2">
          <span>Nome completo</span>
          <input autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </label>
        <label className="field">
          <span>Celular com DDD</span>
          <input inputMode="tel" autoComplete="tel-national" value={formatPhone(v.phone)} onChange={(e) => setV({ ...v, phone: formatPhone(e.target.value) })} />
        </label>
        <label className="field">
          <span>CPF</span>
          <input inputMode="numeric" value={v.cpf} onChange={(e) => setV({ ...v, cpf: e.target.value })} />
        </label>
        <label className="field span2">
          <span>E-mail</span>
          <input value={c.email} disabled />
          <small>É o e-mail com que você entra. Para trocar, fale com a gente.</small>
        </label>
      </div>
      {err && <p className="ferr">{err}</p>}
      <button className="sbtn" disabled={busy}>
        {busy ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}

function Addresses() {
  const shop = useShop();
  const c = shop.customer!;
  const [adding, setAdding] = useState(c.addresses.length === 0);
  const [draft, setDraft] = useState<AddressDraft>(() => emptyAddress(c.name));
  const [errors, setErrors] = useState<Errors<keyof AddressDraft>>({});
  const [busy, setBusy] = useState("");
  const add = async () => {
    const r = checkAddress(draft);
    if (!r.ok) return setErrors(r.errors);
    setErrors({});
    setBusy("novo");
    const s = await saveAddress(r.address);
    setBusy("");
    if (!s.ok) return shop.say(s.error);
    shop.setCustomer({ ...c, addresses: [s.data, ...c.addresses] });
    setDraft(emptyAddress(c.name));
    setAdding(false);
    shop.say("Endereço salvo");
  };
  const del = async (id: string) => {
    setBusy(id);
    const r = await removeAddress(id);
    setBusy("");
    if (!r.ok) return shop.say(r.error);
    shop.setCustomer({ ...c, addresses: c.addresses.filter((a) => a.id !== id) });
  };
  return (
    <div className="acc-addr">
      {c.addresses.length > 0 && (
        <ul>
          {c.addresses.map((a) => (
            <li key={a.id}>
              <span>
                <b>{a.recipient}</b>
                <small>{addressLine(a)}</small>
              </span>
              <button type="button" className="tlink" onClick={() => del(a.id)} disabled={busy === a.id}>
                {busy === a.id ? "Removendo…" : "Remover"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div className="acc-new">
          <h3>Novo endereço</h3>
          <AddressForm value={draft} set={setDraft} errors={errors} />
          <div className="acc-acts">
            <button type="button" className="sbtn" onClick={add} disabled={busy === "novo"}>
              {busy === "novo" ? "Salvando…" : "Salvar endereço"}
            </button>
            {c.addresses.length > 0 && (
              <button type="button" className="tlink" onClick={() => setAdding(false)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <button type="button" className="sbtn line" onClick={() => setAdding(true)}>
          Adicionar endereço
        </button>
      )}
    </div>
  );
}
