"use client";
import { useEffect, useState, type FormEvent } from "react";
import { onlyDigits, type Customer } from "@/entities/order";
import { confirmCode, googleSignIn, requestCode } from "@/server/shop/actions";
import { useShop } from "@/features/shopping/model/ShopProvider";

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? "";

/**
 * Entrar ou criar conta, sem senha: código de 6 números por e-mail, ou Google.
 * No modo demonstração nada sai daqui: o código aparece na tela e o "Google" pede só o e-mail.
 */
export function LoginForm({ title, reason, onDone }: { title?: string; reason?: string; onDone?: (c: Customer) => void }) {
  const shop = useShop();
  const [step, setStep] = useState<"email" | "code" | "google">("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (!wait) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const here = () => window.location.pathname + window.location.search;
  const finish = (c: Customer, favs: string[]) => {
    shop.signedIn(c, favs);
    shop.say(c.name ? `Olá, ${firstName(c.name)}!` : "Pronto, você entrou na sua conta");
    onDone?.(c);
  };

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setErr("");
    const r = await requestCode(email);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setDemoCode(r.data.demoCode);
    setCode("");
    setStep("code");
    setWait(30);
  };

  const verify = async (c = code) => {
    if (c.length !== 6 || busy) return;
    setBusy(true);
    setErr("");
    const r = await confirmCode(email, c, shop.favorites);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    finish(r.data.customer, r.data.favorites);
  };

  const google = async (e?: FormEvent) => {
    e?.preventDefault();
    setErr("");
    if (!shop.demo) {
      setBusy(true);
      const r = await googleSignIn(here());
      if (!r.ok) {
        setBusy(false);
        return setErr(r.error);
      }
      if (r.data.url) window.location.href = r.data.url;
      return;
    }
    if (step !== "google") return setStep("google");
    setBusy(true);
    const r = await googleSignIn(here(), email, name, shop.favorites);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    if (r.data.customer) finish(r.data.customer, r.data.favorites);
  };

  if (step === "code")
    return (
      <div className="lg">
        <h2 className="lg-title">Digite o código</h2>
        <p className="lg-sub">
          Enviamos 6 números para <b>{email}</b>.{" "}
          <button type="button" className="tlink" onClick={() => setStep("email")}>
            Trocar e-mail
          </button>
        </p>
        {demoCode && (
          <div className="demo-box">
            <span>
              Modo demonstração: o código é <b className="mono">{demoCode}</b>
            </span>
            <button
              type="button"
              className="tlink"
              onClick={() => {
                setCode(demoCode);
                verify(demoCode);
              }}
            >
              Usar este código
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <input
            className="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            placeholder="000000"
            aria-label="Código de 6 números"
            autoFocus
            onChange={(e) => {
              const d = onlyDigits(e.target.value).slice(0, 6);
              setCode(d);
              if (d.length === 6) verify(d);
            }}
          />
          {err && (
            <p className="ferr" role="alert">
              {err}
            </p>
          )}
          <button className="sbtn amber wide" disabled={busy || code.length < 6}>
            {busy ? "Conferindo…" : "Entrar"}
          </button>
        </form>
        <p className="lg-foot">
          {wait > 0 ? (
            `Não chegou? Você pode pedir outro em ${wait}s.`
          ) : (
            <button type="button" className="tlink" onClick={() => send()} disabled={busy}>
              Mandar outro código
            </button>
          )}
        </p>
      </div>
    );

  if (step === "google")
    return (
      <div className="lg">
        <h2 className="lg-title">Continuar com Google</h2>
        <div className="demo-box col">Modo demonstração: no site publicado, aqui abre a tela do Google para você escolher a conta. Para simular, informe o e-mail e o nome.</div>
        <form onSubmit={google}>
          <label className="field">
            <span>E-mail da conta Google</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span>Nome</span>
            <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          {err && (
            <p className="ferr" role="alert">
              {err}
            </p>
          )}
          <button className="sbtn amber wide" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="lg-foot">
          <button type="button" className="tlink" onClick={() => setStep("email")}>
            Voltar
          </button>
        </p>
      </div>
    );

  return (
    <div className="lg">
      <h2 className="lg-title">{title ?? "Entrar ou criar conta"}</h2>
      <p className="lg-sub">{reason ?? "Acompanhe pedidos, guarde favoritos e finalize mais rápido. Não tem senha: mandamos um código para o seu e-mail."}</p>
      <form onSubmit={send}>
        <label className="field">
          <span>E-mail</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </label>
        {err && (
          <p className="ferr" role="alert">
            {err}
          </p>
        )}
        <button className="sbtn amber wide" disabled={busy}>
          {busy ? "Enviando…" : "Receber código"}
        </button>
      </form>
      <div className="lg-or">
        <span>ou</span>
      </div>
      <button type="button" className="sbtn line wide" onClick={() => google()} disabled={busy}>
        Continuar com Google
      </button>
      {shop.demo && <p className="demo-note">Modo demonstração: nenhum e-mail é enviado. O código aparece na próxima tela.</p>}
    </div>
  );
}
