"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

/**
 * Barra acima da lista: busca enquanto digita, ordem e, no celular, o botão que abre os filtros numa gaveta.
 * Os resultados vêm do servidor; aqui só trocamos a URL (sem recarregar a página nem pular para o topo).
 */
export function ShopToolbar({
  q,
  total,
  sorts,
  sort,
  searchBase,
  activeFilters,
  panel,
}: {
  q: string;
  total: number;
  sorts: Array<{ id: string; label: string; href: string }>;
  sort: string;
  searchBase: string;
  activeFilters: number;
  panel: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(q);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const drawer = useRef<HTMLDivElement>(null);

  // a URL mudou por fora (chip, limpar tudo): a caixa acompanha
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    setLastQ(q);
    setText(q);
  }

  const go = (href: string) => start(() => router.replace(href, { scroll: false }));
  const search = (value: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const v = value.trim();
      go(v ? `${searchBase}${searchBase.includes("?") ? "&" : "?"}q=${encodeURIComponent(v)}` : searchBase);
    }, 350);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // gaveta: fecha com Esc e ao escolher um filtro; trava a rolagem do fundo
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.classList.add("drawer-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("drawer-open");
    };
  }, [open]);

  return (
    <div className={`shop-tools${pending ? " busy" : ""}`}>
      <form
        className="tsearch"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          window.clearTimeout(timer.current);
          search(text);
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5" />
        </svg>
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            search(e.target.value);
          }}
          placeholder="Buscar por nome, acabamento ou código"
          aria-label="Buscar na loja"
          enterKeyHint="search"
        />
        {text && (
          <button
            type="button"
            className="tclear"
            aria-label="Limpar busca"
            onClick={() => {
              setText("");
              search("");
            }}
          >
            ×
          </button>
        )}
      </form>
      <span className="tcount" aria-live="polite">
        {pending ? "Buscando…" : `${total} ${total === 1 ? "peça" : "peças"}`}
      </span>
      <label className="tsort">
        <span>Ordenar</span>
        <select value={sort} onChange={(e) => go(sorts.find((s) => s.id === e.target.value)!.href)}>
          {sorts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="tfilters" onClick={() => setOpen(true)} aria-expanded={open}>
        Filtros{activeFilters > 0 && <b>{activeFilters}</b>}
      </button>

      <div className={`fdrawer${open ? " open" : ""}`} aria-hidden={!open}>
        <button type="button" className="fback" aria-label="Fechar filtros" tabIndex={-1} onClick={() => setOpen(false)} />
        <div
          className="fsheet"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros"
          ref={drawer}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <div className="fhead">
            <b>Filtros</b>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">
              ×
            </button>
          </div>
          {panel}
          <button type="button" className="btn fdone" onClick={() => setOpen(false)}>
            Ver {total} {total === 1 ? "peça" : "peças"}
          </button>
        </div>
      </div>
    </div>
  );
}
