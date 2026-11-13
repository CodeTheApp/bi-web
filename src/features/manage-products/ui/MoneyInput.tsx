"use client";

import { useState } from "react";

const parseMoney = (s: string) => {
  const t = s.replace(/[^\d,.]/g, "");
  if (!t) return null;
  // "1.234,56" ou "1234.56"
  const n = t.includes(",")
    ? Number(t.replace(/\./g, "").replace(",", "."))
    : Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
};
const moneyText = (c: number | null) =>
  c == null
    ? ""
    : (c / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export function MoneyInput({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (c: number | null) => void;
  label: string;
}) {
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
