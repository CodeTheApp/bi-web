/**
 * Busca, filtros, ordem e paginação da vitrine, a partir dos parâmetros da URL.
 * Tudo vem calculado daqui (contagens, links e chips), então a página e os filtros só desenham.
 */
import { familiesOf, familyColor, FINISH_FAMILIES } from "./swatch";
import { canSell, CATEGORIES, type CategorySlug, type PublicProduct } from "./types";

export const PER_PAGE = 24;

export const SORTS = [
  { id: "", label: "Curadoria" },
  { id: "menor-preco", label: "Menor preço" },
  { id: "maior-preco", label: "Maior preço" },
  { id: "nome", label: "Nome (A–Z)" },
] as const;

export const PRICES = [
  { id: "ate-1000", label: "Até R$ 1.000", min: 0, max: 100000 },
  { id: "1000-3000", label: "R$ 1.000 a R$ 3.000", min: 100000, max: 300000 },
  { id: "3000-6000", label: "R$ 3.000 a R$ 6.000", min: 300000, max: 600000 },
  { id: "acima-6000", label: "Acima de R$ 6.000", min: 600000, max: Infinity },
] as const;

export type BrowseState = { categoria?: CategorySlug; q: string; ordem: string; pagina: number; cor: string[]; preco?: string; pronta: boolean; video: boolean };
type Params = Record<string, string | string[] | undefined>;

const many = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => many(v)[0] ?? "";
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function readState(sp: Params): BrowseState {
  return {
    categoria: CATEGORIES.find((c) => c.slug === one(sp.categoria))?.slug,
    q: one(sp.q).trim().slice(0, 80),
    ordem: SORTS.find((s) => s.id === one(sp.ordem))?.id ?? "",
    pagina: Math.max(1, Number.parseInt(one(sp.pagina), 10) || 1),
    cor: many(sp.cor).filter((c) => FINISH_FAMILIES.some((f) => f.id === c)),
    preco: PRICES.find((p) => p.id === one(sp.preco))?.id,
    pronta: one(sp.pronta) === "1",
    video: one(sp.video) === "1",
  };
}

export function hrefFor(s: BrowseState, patch: Partial<BrowseState> = {}) {
  const n = { ...s, pagina: 1, ...patch };
  const p = new URLSearchParams();
  if (n.categoria) p.set("categoria", n.categoria);
  if (n.q) p.set("q", n.q);
  for (const c of n.cor) p.append("cor", c);
  if (n.preco) p.set("preco", n.preco);
  if (n.pronta) p.set("pronta", "1");
  if (n.video) p.set("video", "1");
  if (n.ordem) p.set("ordem", n.ordem);
  if (n.pagina > 1) p.set("pagina", String(n.pagina));
  const qs = p.toString();
  return qs ? `/loja?${qs}` : "/loja";
}

const sellable = (p: PublicProduct) => p.variants.filter(canSell);
const minPrice = (p: PublicProduct) => Math.min(...sellable(p).map((v) => v.priceCents ?? Infinity));
const families = (p: PublicProduct) => new Set(sellable(p).flatMap((v) => (v.options.acabamento ? familiesOf(v.options.acabamento) : [])));
const inStock = (p: PublicProduct) => p.variants.some((v) => v.inStock);
const hasVideo = (p: PublicProduct) => p.media.some((m) => m.kind === "video");

function matchesQ(p: PublicProduct, q: string) {
  if (!q) return true;
  const hay = norm(`${p.title} ${p.variants.map((v) => `${v.sku} ${Object.values(v.options).join(" ")}`).join(" ")} ${Object.values(p.specs).join(" ")}`);
  return norm(q).split(/\s+/).every((w) => hay.includes(w));
}

/** Aplica os filtros; `skip` deixa um filtro de fora (para contar as opções daquele grupo). */
function apply(all: PublicProduct[], s: BrowseState, skip?: "categoria" | "cor" | "preco" | "pronta" | "video") {
  return all.filter((p) => {
    if (skip !== "categoria" && s.categoria && p.category !== s.categoria) return false;
    if (!matchesQ(p, s.q)) return false;
    if (skip !== "cor" && s.cor.length) {
      const f = families(p);
      if (!s.cor.some((c) => f.has(c))) return false;
    }
    if (skip !== "preco" && s.preco) {
      const r = PRICES.find((x) => x.id === s.preco)!;
      const m = minPrice(p);
      if (!(m >= r.min && m < r.max)) return false;
    }
    if (skip !== "pronta" && s.pronta && !inStock(p)) return false;
    if (skip !== "video" && s.video && !hasVideo(p)) return false;
    return true;
  });
}

export function browse(all: PublicProduct[], s: BrowseState) {
  let list = apply(all, s);
  if (s.ordem === "menor-preco") list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
  else if (s.ordem === "maior-preco") list = [...list].sort((a, b) => (minPrice(b) === Infinity ? -1 : minPrice(a) === Infinity ? 1 : minPrice(b) - minPrice(a)));
  else if (s.ordem === "nome") list = [...list].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  // curadoria: pronta entrega e com foto primeiro, depois na ordem do catálogo
  else list = [...list].sort((a, b) => Number(inStock(b)) - Number(inStock(a)) || Number(b.media.length > 0) - Number(a.media.length > 0));

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(pages, s.pagina);
  const shown = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const byCat = apply(all, s, "categoria");
  const byCor = apply(all, s, "cor");
  const byPreco = apply(all, s, "preco");
  const byPronta = apply(all, s, "pronta");
  const byVideo = apply(all, s, "video");

  const facets = {
    categories: [
      { id: "", label: "Todas as peças", count: byCat.length, on: !s.categoria, href: hrefFor(s, { categoria: undefined }) },
      ...CATEGORIES.map((c) => ({ id: c.slug, label: c.name, count: byCat.filter((p) => p.category === c.slug).length, on: s.categoria === c.slug, href: hrefFor(s, { categoria: c.slug }) })).filter(
        (c) => c.count > 0 || c.on,
      ),
    ],
    finishes: FINISH_FAMILIES.map((f) => {
      const on = s.cor.includes(f.id);
      return { id: f.id, label: f.label, color: familyColor(f.id), count: byCor.filter((p) => families(p).has(f.id)).length, on, href: hrefFor(s, { cor: on ? s.cor.filter((c) => c !== f.id) : [...s.cor, f.id] }) };
    }).filter((f) => f.count > 0 || f.on),
    prices: PRICES.map((r) => {
      const on = s.preco === r.id;
      return { id: r.id, label: r.label, count: byPreco.filter((p) => minPrice(p) >= r.min && minPrice(p) < r.max).length, on, href: hrefFor(s, { preco: on ? undefined : r.id }) };
    }).filter((r) => r.count > 0 || r.on),
    ready: { count: byPronta.filter(inStock).length, on: s.pronta, href: hrefFor(s, { pronta: !s.pronta }) },
    video: { count: byVideo.filter(hasVideo).length, on: s.video, href: hrefFor(s, { video: !s.video }) },
  };

  const chips = [
    ...(s.q ? [{ label: `“${s.q}”`, href: hrefFor(s, { q: "" }) }] : []),
    ...(s.categoria ? [{ label: CATEGORIES.find((c) => c.slug === s.categoria)!.name, href: hrefFor(s, { categoria: undefined }) }] : []),
    ...s.cor.map((c) => ({ label: FINISH_FAMILIES.find((f) => f.id === c)!.label, href: hrefFor(s, { cor: s.cor.filter((x) => x !== c) }) })),
    ...(s.preco ? [{ label: PRICES.find((p) => p.id === s.preco)!.label, href: hrefFor(s, { preco: undefined }) }] : []),
    ...(s.pronta ? [{ label: "Pronta entrega", href: hrefFor(s, { pronta: false }) }] : []),
    ...(s.video ? [{ label: "Com vídeo", href: hrefFor(s, { video: false }) }] : []),
  ];

  // páginas: primeira, última e as vizinhas da atual, com reticências
  const nums = [...new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  const pager = nums.flatMap((n, i) => (i > 0 && n - nums[i - 1] > 1 ? [null, n] : [n])).map((n) => (n == null ? null : { n, href: `${hrefFor(s, { pagina: n })}#produtos`, on: n === page }));

  return {
    list: shown,
    total: list.length,
    page,
    pages,
    facets,
    chips,
    clearHref: hrefFor({ ...s, categoria: undefined, q: "", cor: [], preco: undefined, pronta: false, video: false }),
    prevHref: page > 1 ? `${hrefFor(s, { pagina: page - 1 })}#produtos` : null,
    nextHref: page < pages ? `${hrefFor(s, { pagina: page + 1 })}#produtos` : null,
    pager,
    sorts: SORTS.map((o) => ({ id: o.id, label: o.label, href: hrefFor(s, { ordem: o.id }) })),
    searchBase: hrefFor(s, { q: "" }),
    activeFilters: chips.length - (s.q ? 1 : 0),
  };
}

export type BrowseResult = ReturnType<typeof browse>;
