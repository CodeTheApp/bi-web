"use client";
import { Search, X } from "@/shared/ui/icons/lucide";

import { debounce, defaultRateLimit, useQueryStates } from "nuqs";
import { catalogSearchParams } from "@/features/catalog-filter/model/search-params";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

/**
 * Barra acima da lista: busca enquanto digita, ordem e, no celular, o botão que abre os filtros numa gaveta.
 * Os resultados vêm do servidor; aqui só trocamos a URL (sem recarregar a página nem pular para o topo).
 */
export function ShopToolbar({
  total,
  sorts,
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
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useQueryStates(catalogSearchParams, {
    shallow: false,
    history: "replace",
    scroll: false,
    startTransition,
  });
  const text = query.q;
  const [open, setOpen] = useState(false);
  const drawer = useRef<HTMLDivElement>(null);

  const search = (value: string, immediately = false) =>
    void setQuery(
      { q: value.slice(0, 80), pagina: 1 },
      {
        limitUrlUpdates:
          immediately || !value ? defaultRateLimit : debounce(350),
      },
    );

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
        data-icon-scope=""
        onSubmit={(e) => {
          e.preventDefault();
          search(text.trim(), true);
        }}
      >
        <Search size={17} strokeWidth={1.7} aria-hidden="true" />
        <input
          value={text}
          onChange={(e) => {
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
              search("");
            }}
          >
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </form>
      <span className="tcount" aria-live="polite">
        {pending ? "Buscando…" : `${total} ${total === 1 ? "peça" : "peças"}`}
      </span>
      <label className="tsort">
        <span>Ordenar</span>
        <select
          value={query.ordem}
          onChange={(e) =>
            void setQuery(
              { ordem: e.target.value, pagina: 1 },
              { history: "push", limitUrlUpdates: defaultRateLimit },
            )
          }
        >
          {sorts.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="tfilters"
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        Filtros{activeFilters > 0 && <b>{activeFilters}</b>}
      </button>

      <div className={`fdrawer${open ? " open" : ""}`} aria-hidden={!open}>
        <button
          type="button"
          className="fback"
          aria-label="Fechar filtros"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
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
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
          {panel}
          <button
            type="button"
            className="btn fdone"
            onClick={() => setOpen(false)}
          >
            Ver {total} {total === 1 ? "peça" : "peças"}
          </button>
        </div>
      </div>
    </div>
  );
}
