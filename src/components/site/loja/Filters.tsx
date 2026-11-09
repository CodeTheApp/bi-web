import Link from "next/link";
import type { BrowseResult } from "@/lib/catalog/browse";

/** Coluna de filtros da vitrine (também usada dentro da gaveta no celular). Só desenha: links e contagens vêm prontos. */
export function FilterPanel({ r }: { r: BrowseResult }) {
  const f = r.facets;
  return (
    <div className="fpanel">
      <section>
        <h3>Categorias</h3>
        <ul className="fcats">
          {f.categories.map((c) => (
            <li key={c.id || "todas"}>
              <Link href={c.href} scroll={false} aria-current={c.on ? "true" : undefined}>
                {c.label}
                <span>{c.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Disponibilidade</h3>
        <div className="ftoggles">
          <Link href={f.ready.href} scroll={false} className={f.ready.on ? "on" : undefined} aria-pressed={f.ready.on} role="button">
            <i aria-hidden="true" />
            Pronta entrega <span>{f.ready.count}</span>
          </Link>
          {(f.video.count > 0 || f.video.on) && (
            <Link href={f.video.href} scroll={false} className={f.video.on ? "on" : undefined} aria-pressed={f.video.on} role="button">
              <i aria-hidden="true" />
              Com vídeo <span>{f.video.count}</span>
            </Link>
          )}
        </div>
      </section>

      {f.finishes.length > 0 && (
        <section>
          <h3>Acabamento</h3>
          <div className="ffin">
            {f.finishes.map((x) => (
              <Link key={x.id} href={x.href} scroll={false} className={x.on ? "on" : undefined} aria-pressed={x.on} role="button" title={`${x.label} · ${x.count}`}>
                <i style={{ background: x.color }} aria-hidden="true" />
                {x.label}
                <span>{x.count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {f.prices.length > 0 && (
        <section>
          <h3>Preço</h3>
          <ul className="fprices">
            {f.prices.map((p) => (
              <li key={p.id}>
                <Link href={p.href} scroll={false} aria-current={p.on ? "true" : undefined}>
                  <i aria-hidden="true" />
                  {p.label}
                  <span>{p.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.activeFilters > 0 && (
        <Link className="fclear" href={r.clearHref} scroll={false}>
          Limpar filtros
        </Link>
      )}
    </div>
  );
}

/** Filtros ativos, cada um com × para tirar. */
export function ActiveChips({ r }: { r: BrowseResult }) {
  if (!r.chips.length) return null;
  return (
    <div className="fchips">
      {r.chips.map((c) => (
        <Link key={c.label} href={c.href} scroll={false} aria-label={`Remover filtro ${c.label}`}>
          {c.label}
          <span aria-hidden="true">×</span>
        </Link>
      ))}
      {r.chips.length > 1 && (
        <Link className="all" href={r.clearHref} scroll={false}>
          Limpar tudo
        </Link>
      )}
    </div>
  );
}

/** Paginação numerada: anterior, 1 … 4 5 6 … 12, próxima. */
export function Pager({ r }: { r: BrowseResult }) {
  if (r.pages < 2) return null;
  return (
    <nav className="pager" aria-label="Páginas">
      {r.prevHref ? (
        <Link className="pg-arrow" href={r.prevHref}>
          ← Anterior
        </Link>
      ) : (
        <span className="pg-arrow off">← Anterior</span>
      )}
      <ol>
        {r.pager.map((p, i) =>
          p ? (
            <li key={p.n}>
              <Link href={p.href} aria-current={p.on ? "page" : undefined}>
                {p.n}
              </Link>
            </li>
          ) : (
            <li key={`e${i}`} className="gap" aria-hidden="true">
              …
            </li>
          ),
        )}
      </ol>
      {r.nextHref ? (
        <Link className="pg-arrow" href={r.nextHref}>
          Próxima →
        </Link>
      ) : (
        <span className="pg-arrow off">Próxima →</span>
      )}
    </nav>
  );
}
