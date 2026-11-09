"use client";
import { I } from "./icons";

/** Quantidade: menos, número e mais. */
export function Qty({ value, onChange, max = 99, label = "Quantidade", size = "md" }: { value: number; onChange: (n: number) => void; max?: number; label?: string; size?: "sm" | "md" }) {
  return (
    <div className={`qty ${size}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Diminuir">
        <I n="minus" size={16} />
      </button>
      <input
        inputMode="numeric"
        value={value}
        aria-label={label}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value.replace(/\D/g, ""), 10);
          if (Number.isFinite(n)) onChange(Math.max(1, Math.min(max, n)));
        }}
        onFocus={(e) => e.target.select()}
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Aumentar">
        <I n="plus" size={16} />
      </button>
    </div>
  );
}
