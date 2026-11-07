"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Result } from "@/server/admin/actions";
import { Icon } from "./icons";

/* ---------------- resultado das ações ---------------- */
export async function unwrap<T>(p: Promise<Result<T>>): Promise<T> {
  const r = await p;
  if (!r.ok) throw new Error(r.error);
  return r.data;
}

/* ---------------- aviso (toast) ---------------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [on, setOn] = useState(false);
  const t = useRef<number | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    setOn(true);
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setOn(false), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={`toast${on ? " on" : ""}`} role="status" aria-live="polite">
        <Icon name="check" />
        <span>{msg}</span>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- pedaços de interface ---------------- */
export const STATUS_LABEL: Record<string, string> = {
  novo: "Novo", andamento: "Em andamento", respondido: "Respondido", arquivado: "Arquivado", publicado: "Publicado", rascunho: "Rascunho", oculto: "Oculto",
};
export const Chip = ({ s }: { s: string }) => <span className={`chip ${s}`}>{STATUS_LABEL[s] ?? s}</span>;

export function Switch({ checked, onChange, title }: { checked: boolean; onChange: (v: boolean) => void; title?: string }) {
  return (
    <label className="sw" title={title}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={title} />
      <i />
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} className={v === value ? "on" : undefined} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, children, wide }: { open: boolean; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal on" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="box" style={wide ? { width: "min(900px,100%)" } : undefined}>
        {children}
      </div>
    </div>
  );
}

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="ph">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}

export const Skeleton = ({ h = 120, style }: { h?: number; style?: React.CSSProperties }) => <div className="skel" style={{ height: h, ...style }} />;

export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div className="card pad" role="alert">
      <b>Não foi possível carregar.</b>
      <p className="muted" style={{ margin: "6px 0 12px" }}>{error instanceof Error ? error.message : "Tente de novo."}</p>
      {retry && (
        <button className="btn sec sm" onClick={retry}>
          Tentar de novo
        </button>
      )}
    </div>
  );
}

/* ---------------- utilidades ---------------- */
export function ago(iso: string) {
  const t = new Date(iso).getTime();
  const d = Date.now() - t;
  const H = 3600e3, D = 24 * H;
  if (d < 60e3) return "agora";
  if (d < H) return `${Math.round(d / 60e3)} min`;
  if (d < D) return `${Math.round(d / H)} h`;
  if (d < 7 * D) return `${Math.round(d / D)} d`;
  return new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
export const initials = (n: string) =>
  n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Atraso para salvar enquanto a pessoa digita. Se a tela fechar antes, salva na hora (nada se perde). */
export function useDebounced<T extends unknown[]>(fn: (...a: T) => void, ms = 700) {
  const t = useRef<number | undefined>(undefined);
  const pending = useRef<T | null>(null);
  const f = useRef(fn);
  useEffect(() => {
    f.current = fn;
  });
  useEffect(
    () => () => {
      window.clearTimeout(t.current);
      if (pending.current) f.current(...pending.current);
    },
    [],
  );
  return useCallback(
    (...a: T) => {
      window.clearTimeout(t.current);
      pending.current = a;
      t.current = window.setTimeout(() => {
        pending.current = null;
        f.current(...a);
      }, ms);
    },
    [ms],
  );
}
