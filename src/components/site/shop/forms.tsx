"use client";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { brl } from "@/lib/catalog/types";
import { addressSchema, formatCep, installmentsFor, onlyDigits, type Address } from "@/lib/shop/types";

/* ---------------- endereço ---------------- */
export type AddressDraft = Omit<Address, "id"> & { id: string };
export const emptyAddress = (recipient = ""): AddressDraft => ({ id: "", recipient, cep: "", street: "", number: "", complement: "", district: "", city: "", uf: "" });
export type Errors<K extends string> = Partial<Record<K, string>>;

/** Confere o endereço; devolve o endereço limpo ou os erros por campo. */
export function checkAddress(d: AddressDraft): { ok: true; address: Address } | { ok: false; errors: Errors<keyof AddressDraft> } {
  const r = addressSchema.safeParse({ ...d, cep: formatCep(d.cep) });
  if (r.success) return { ok: true, address: r.data };
  const errors: Errors<keyof AddressDraft> = {};
  for (const i of r.error.issues) errors[i.path[0] as keyof AddressDraft] ??= i.message;
  return { ok: false, errors };
}

export const addressLine = (a: Pick<Address, "street" | "number" | "complement" | "district" | "city" | "uf" | "cep">) =>
  `${a.street}, ${a.number}${a.complement ? ` · ${a.complement}` : ""} · ${a.district}, ${a.city}/${a.uf} · ${formatCep(a.cep)}`;

/** Formulário de endereço: o CEP completa rua, bairro, cidade e UF (ViaCEP, direto do navegador). */
type ViaCep = { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
const viaCep = (digits: string) => fetch(`https://viacep.com.br/ws/${digits}/json/`).then((r) => r.json() as Promise<ViaCep>);

export function AddressForm({
  value,
  set,
  errors = {},
  recipientHint = "",
}: {
  value: AddressDraft;
  set: Dispatch<SetStateAction<AddressDraft>>;
  errors?: Errors<keyof AddressDraft>;
  recipientHint?: string;
}) {
  const [cepState, setCepState] = useState<"" | "busy" | "ok" | "fail">("");
  const num = useRef<HTMLInputElement>(null);
  const field = (k: keyof AddressDraft) => ({
    value: value[k],
    onChange: (e: { target: { value: string } }) => set((v) => ({ ...v, [k]: e.target.value })),
    "aria-invalid": !!errors[k] || undefined,
  });

  const lookup = async (digits: string) => {
    setCepState("busy");
    try {
      const j = await viaCep(digits);
      if (j.erro) return setCepState("fail");
      set((v) => ({ ...v, street: j.logradouro || v.street, district: j.bairro || v.district, city: j.localidade || v.city, uf: j.uf || v.uf }));
      setCepState("ok");
      num.current?.focus();
    } catch {
      setCepState("fail");
    }
  };

  // CEP que já veio preenchido (o último usado): completa a rua sem a pessoa precisar redigitar
  useEffect(() => {
    const d = onlyDigits(value.cep);
    if (d.length !== 8 || value.street) return;
    viaCep(d)
      .then((j) => !j.erro && set((v) => ({ ...v, street: v.street || j.logradouro || "", district: v.district || j.bairro || "", city: v.city || j.localidade || "", uf: v.uf || j.uf || "" })))
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const err = (k: keyof AddressDraft) => (errors[k] ? <small className="ferr">{errors[k]}</small> : null);

  return (
    <div className="addr-form">
      <div className="addr-cep">
        <label className={`field${errors.cep ? " bad" : ""}`}>
          <span>CEP</span>
          <input
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={formatCep(value.cep)}
            aria-invalid={!!errors.cep || undefined}
            onChange={(e) => {
              const cep = formatCep(e.target.value);
              set((v) => ({ ...v, cep }));
              if (onlyDigits(cep).length === 8 && onlyDigits(cep) !== onlyDigits(value.cep)) lookup(onlyDigits(cep));
              else setCepState("");
            }}
          />
          {err("cep")}
        </label>
        <p className="addr-cep-note" aria-live="polite">
          {cepState === "busy" ? (
            "Buscando o endereço…"
          ) : cepState === "fail" ? (
            "Não achamos este CEP. Preencha o endereço abaixo."
          ) : cepState === "ok" ? (
            "Endereço encontrado. Confira e informe o número."
          ) : (
            <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener">
              Não sei meu CEP
            </a>
          )}
        </p>
      </div>
      <div className="addr-grid">
        <label className={`field span2${errors.street ? " bad" : ""}`}>
          <span>Rua, avenida ou quadra</span>
          <input autoComplete="address-line1" {...field("street")} />
          {err("street")}
        </label>
        <label className={`field${errors.number ? " bad" : ""}`}>
          <span>Número</span>
          <input ref={num} autoComplete="address-line2" {...field("number")} />
          {err("number")}
        </label>
        <label className="field">
          <span>Complemento (opcional)</span>
          <input {...field("complement")} placeholder="Apto, bloco, casa" />
        </label>
        <label className={`field span2${errors.district ? " bad" : ""}`}>
          <span>Bairro</span>
          <input {...field("district")} />
          {err("district")}
        </label>
        <label className={`field span2${errors.city ? " bad" : ""}`}>
          <span>Cidade</span>
          <input autoComplete="address-level2" {...field("city")} />
          {err("city")}
        </label>
        <label className={`field${errors.uf ? " bad" : ""}`}>
          <span>UF</span>
          <input autoComplete="address-level1" maxLength={2} {...field("uf")} onChange={(e) => set((v) => ({ ...v, uf: e.target.value.toUpperCase() }))} />
          {err("uf")}
        </label>
        <label className={`field span3${errors.recipient ? " bad" : ""}`}>
          <span>Quem vai receber</span>
          <input autoComplete="name" placeholder={recipientHint} {...field("recipient")} />
          {err("recipient")}
        </label>
      </div>
    </div>
  );
}

/* ---------------- cartão ---------------- */
export type CardDraft = { number: string; holder: string; exp: string; cvv: string; installments: number };
export const emptyCard: CardDraft = { number: "", holder: "", exp: "", cvv: "", installments: 1 };

export function cardBrand(digits: string) {
  if (/^(4011|4312|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(digits)) return "Elo";
  if (/^(606282|3841)/.test(digits)) return "Hipercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^4/.test(digits)) return "Visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return "Mastercard";
  return "";
}
const formatCard = (s: string) => {
  const d = onlyDigits(s).slice(0, 19);
  return /^3[47]/.test(d) ? d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(" ")) : d.replace(/(\d{4})(?=\d)/g, "$1 ");
};
const formatExp = (s: string) =>
  onlyDigits(s)
    .slice(0, 4)
    .replace(/^(\d{2})(\d)/, "$1/$2");

export function checkCard(c: CardDraft): Errors<keyof CardDraft> {
  const e: Errors<keyof CardDraft> = {};
  const d = onlyDigits(c.number);
  if (d.length < 13) e.number = "Confira o número do cartão.";
  if (c.holder.trim().length < 3) e.holder = "Nome como está no cartão.";
  const [mm, yy] = c.exp.split("/").map(Number);
  const now = new Date();
  if (!mm || mm > 12 || yy == null || Number.isNaN(yy) || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1)) e.exp = "Validade inválida.";
  if (!/^\d{3,4}$/.test(c.cvv)) e.cvv = "3 ou 4 números.";
  return e;
}

/** O que sai do navegador: só o final do cartão, a bandeira e as parcelas. Número e CVV nunca vão para o servidor. */
export const cardInput = (c: CardDraft) => ({ holder: c.holder.trim(), last4: onlyDigits(c.number).slice(-4), brand: cardBrand(onlyDigits(c.number)) || "Cartão", installments: c.installments });

export function CardFields({ value, set, total, errors = {} }: { value: CardDraft; set: Dispatch<SetStateAction<CardDraft>>; total: number; errors?: Errors<keyof CardDraft> }) {
  const brand = cardBrand(onlyDigits(value.number));
  const max = installmentsFor(total);
  return (
    <div className="card-grid">
      <label className={`field span2${errors.number ? " bad" : ""}`}>
        <span>Número do cartão</span>
        <div className="card-num">
          <input inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={value.number} onChange={(e) => set((v) => ({ ...v, number: formatCard(e.target.value) }))} />
          {brand && <em>{brand}</em>}
        </div>
        {errors.number && <small className="ferr">{errors.number}</small>}
      </label>
      <label className={`field span2${errors.holder ? " bad" : ""}`}>
        <span>Nome impresso no cartão</span>
        <input autoComplete="cc-name" value={value.holder} onChange={(e) => set((v) => ({ ...v, holder: e.target.value.toUpperCase() }))} />
        {errors.holder && <small className="ferr">{errors.holder}</small>}
      </label>
      <label className={`field${errors.exp ? " bad" : ""}`}>
        <span>Validade</span>
        <input inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={value.exp} onChange={(e) => set((v) => ({ ...v, exp: formatExp(e.target.value) }))} />
        {errors.exp && <small className="ferr">{errors.exp}</small>}
      </label>
      <label className={`field${errors.cvv ? " bad" : ""}`}>
        <span>CVV</span>
        <input inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} value={value.cvv} onChange={(e) => set((v) => ({ ...v, cvv: onlyDigits(e.target.value).slice(0, 4) }))} />
        {errors.cvv && <small className="ferr">{errors.cvv}</small>}
      </label>
      <label className="field span2">
        <span>Parcelas</span>
        <select value={Math.min(value.installments, max)} onChange={(e) => set((v) => ({ ...v, installments: Number(e.target.value) }))}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n === 1 ? `À vista · ${brl(total)}` : `${n}x de ${brl(Math.ceil(total / n))} sem juros`}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
