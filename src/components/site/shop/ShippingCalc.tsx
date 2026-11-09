"use client";
import { useState, type FormEvent } from "react";
import { brl } from "@/lib/catalog/types";
import { formatCep, onlyDigits, type ShippingChoice } from "@/lib/shop/types";
import { shippingOptions } from "@/server/shop/actions";
import { I } from "./icons";
import { cepStore } from "./local";

/** Frete e prazo pelo CEP, na página do produto. O CEP fica guardado para o checkout. */
export function ShippingCalc({ variantId, qty }: { variantId: string; qty: number }) {
  const saved = cepStore.use();
  const [typed, setTyped] = useState<string | null>(null);
  const cep = typed ?? formatCep(saved);
  // a cotação vale para a variante e a quantidade em que foi feita
  const [result, setResult] = useState<{ key: string; opts: ShippingChoice[] } | null>(null);
  const key = `${variantId}:${qty}`;
  const opts = result?.key === key ? result.opts : null;
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const calc = async (e: FormEvent) => {
    e.preventDefault();
    if (onlyDigits(cep).length !== 8) return setErr("Digite os 8 números do CEP.");
    setBusy(true);
    setErr("");
    const r = await shippingOptions(cep, [{ variantId, qty }]);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setResult({ key, opts: r.data });
    cepStore.set(onlyDigits(cep));
  };

  return (
    <div className="pship">
      <form onSubmit={calc}>
        <label htmlFor="pship-cep">
          <I n="truck" size={18} /> Frete e prazo
        </label>
        <div className="pship-in">
          <input id="pship-cep" inputMode="numeric" autoComplete="postal-code" placeholder="CEP" value={cep} onChange={(e) => setTyped(formatCep(e.target.value))} />
          <button type="submit" disabled={busy}>
            {busy ? "…" : "Calcular"}
          </button>
        </div>
      </form>
      {err && <p className="ferr">{err}</p>}
      {opts && (
        <ul>
          {opts.map((o) => (
            <li key={o.id}>
              <span>
                {o.label}
                <small>{o.days}</small>
              </span>
              <b className={o.priceCents ? "" : "free"}>{o.priceCents ? brl(o.priceCents) : "Grátis"}</b>
            </li>
          ))}
        </ul>
      )}
      <a className="pship-help" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener">
        Não sei meu CEP
      </a>
    </div>
  );
}
