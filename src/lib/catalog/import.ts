/**
 * Importa a planilha de produtos exportada da loja antiga (formato Magento:
 * ID, Nome, Tipo, Grupo de Atributos, SKU, Preco, Qtd, Visibilidade, Status).
 *
 * A planilha não diz qual item simples pertence a qual configurável, então as variantes
 * são agrupadas pelo SKU (ex.: "WJ 906 PT" e "WJ 906 GOLD" → família "WJ 906") e, quando
 * o SKU é só numérico, pelo nome sem a cor. O título, o acabamento, o tamanho e a
 * ficha técnica saem do nome. Tudo continua editável no painel; o nome original fica guardado.
 */
import type { CategorySlug, Product, Variant } from "./types";
import { CATEGORIES } from "./types";

export type RawRow = {
  id: string;
  name: string;
  configurable: boolean;
  sku: string;
  priceCents: number | null;
  qty: number;
  visible: boolean;
  enabled: boolean;
};

export type ImportReport = {
  rows: number;
  products: number;
  variants: number;
  published: number;
  drafts: number;
  noPrice: number;
  inStock: number;
  skipped: Array<{ id: string; name: string; reason: string }>;
  byCategory: Record<string, number>;
};

/* ---------------- CSV ---------------- */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"' && s[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) out.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) out.push(row);
  return out;
}

export const parseBRL = (s: string) => {
  const n = Number(s.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};

export function readRows(text: string): RawRow[] {
  const [head, ...lines] = parseCsv(text);
  const ix = (name: string) => {
    const i = head.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
    if (i < 0) throw new Error(`A planilha não tem a coluna "${name}".`);
    return i;
  };
  const c = { id: ix("ID"), name: ix("Nome"), type: ix("Tipo"), sku: ix("SKU"), price: ix("Preco"), qty: ix("Qtd"), vis: ix("Visibilidade"), status: ix("Status") };
  return lines.map((l) => ({
    id: (l[c.id] ?? "").trim(),
    name: (l[c.name] ?? "").replace(/\s+/g, " ").trim(),
    configurable: /configur/i.test(l[c.type] ?? ""),
    sku: (l[c.sku] ?? "").replace(/\s+/g, " ").trim(),
    priceCents: parseBRL(l[c.price] ?? ""),
    qty: Number.parseInt(l[c.qty] ?? "0", 10) || 0,
    visible: !/não exibir/i.test(l[c.vis] ?? ""),
    enabled: /habilitado/i.test(l[c.status] ?? "") && !/desabilitado/i.test(l[c.status] ?? ""),
  }));
}

/* ---------------- vocabulário ---------------- */
const TYPE_PREFIXES: Array<[RegExp, CategorySlug]> = [
  [/^COL\.?\s?DE PAREDE\b/, "colunas-de-parede"],
  [/^COLUNA DE PISO\b/, "colunas"],
  [/^COLUNA\b/, "colunas"],
  [/^ARAND\/SOBREPOR\b/, "arandelas"],
  [/^ARAND(ELA)?\b/, "arandelas"],
  [/^PEND(ENTE)?\b/, "pendentes"],
  [/^LUSTRE\b/, "lustres"],
  [/^ABAJUR\b/, "abajures"],
  [/^LUMIN[ÁA]RIA\b/, "abajures"],
  [/^PLAFON\b/, "plafons"],
  [/^SOBREPOR\b/, "sobrepor"],
  [/^SPOT\b/, "spots"],
  [/^M[ÓO]DULO\b/, "modulos"],
];

/** Códigos de cor no fim do SKU (ex.: "WJ 906 OUN"). */
const SKU_COLORS: Record<string, string> = {
  PT: "Preto", BE: "Bege", BG: "Bege", MR: "Marrom", GR: "Grafite", BR: "Branco", PLA: "Platinum", OXI: "Oxidado",
  OUN: "Ouro novo", MTRO: "Metal rosé", GOLD: "Gold", CORT: "Corten", COT: "Corten", COR: "Corten", CO: "Cobre", COBRE: "Cobre",
};

/** Palavras de cor/acabamento no nome, das mais longas para as mais curtas. */
const COLOR_WORDS: Array<[string, string]> = [
  ["FRENCH GOLD", "French gold"], ["OURO NOVO", "Ouro novo"], ["METAL ROSE", "Metal rosé"], ["OFF WHITE", "Off white"], ["CROMO NEGRO", "Cromo negro"],
  ["PRETO", "Preto"], ["BRANCO", "Branco"], ["DOURADO", "Dourado"], ["COBRE", "Cobre"], ["CROMADO", "Cromado"], ["OPALINO", "Opalino"],
  ["TRANSPARENTE", "Transparente"], ["TRANSP", "Transparente"], ["BEGE", "Bege"], ["CINZA", "Cinza"], ["VERDE", "Verde"], ["LATÃO", "Latão"],
  ["BRONZE", "Bronze"], ["AREIA", "Areia"], ["LEITOSO", "Leitoso"], ["CONHAQ", "Conhaque"], ["GRAFITE", "Grafite"], ["MARROM", "Marrom"],
  ["PLATINUM", "Platinum"], ["OXIDADO", "Oxidado"], ["GOLD", "Gold"], ["CORTEN", "Corten"], ["TERRACOTA", "Terracota"], ["TERRACOT", "Terracota"],
  ["CORAL", "Coral"], ["AMARELO", "Amarelo"], ["AZUL", "Azul"], ["ROSA", "Rosa"], ["CHAMP", "Champanhe"], ["PEROLIZADO", "Perolizado"],
  ["AMBAR", "Âmbar"], ["ÂMBAR", "Âmbar"], ["NATURAL", "Natural"], ["TRANSLÚCIDO", "Translúcido"], ["FUMÊ", "Fumê"], ["FUME", "Fumê"],
  ["VERMELHO", "Vermelho"], ["NUDE", "Nude"], ["CARAMELO", "Caramelo"], ["MOSTARDA", "Mostarda"], ["PRATA", "Prata"],
  ["NICKEL", "Níquel"], ["OURO", "Ouro"], ["BRNCO", "Branco"], ["BRANC", "Branco"], ["PRET", "Preto"],
  ["ROSE", "Rosé"], ["CAFÉ", "Café"], ["ROXO", "Roxo"], ["NIQUELADO", "Niquelado"], ["VERMELHA", "Vermelho"], ["CRISTAL", "Cristal"],
];
const COLOR_SET = new Set(COLOR_WORDS.map(([w]) => w));
const STOP_WORDS = new Set(["LED", "METAL", "VIDRO", "ACRÍLICO", "ACRILICO", "TEXT", "MADEIRA", "CÚP", "CUP", "DIR", "BULBO", "MINI", "C", "S", "CABO", "AÇO", "TECIDO", "SOBREPOR", "DE", "COM", "EM", "PARA", "INTERCAMBIÁVEL", "ARTIC", "ESFERA", "PISO", "PAREDE", "TETO"]);
const SMALL = new Set(["de", "da", "do", "das", "dos", "e", "com", "em"]);

const tokens = (name: string) => name.replace(/\s+-\s+.*$/, "").split(/[\s/]+/).filter(Boolean);
const clean = (t: string) => t.replace(/[.,]+$/, "").toUpperCase();
const isSpec = (t: string) => /\d/.test(t) || /^(IP|IRC)\d*$/.test(t);

export function titleCase(s: string, inner = false) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => ((i > 0 || inner) && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/\bPoa\b/, "Poá");
}

export function categoryOf(name: string): CategorySlug | null {
  const n = name.toUpperCase();
  return TYPE_PREFIXES.find(([re]) => re.test(n))?.[1] ?? null;
}

/** "PEND GODA CHAPÉU 6M 1XE27" → "Goda Chapéu" (o modelo, sem tipo, cor e especificações). */
export function modelName(name: string): string {
  const n = name.toUpperCase().replace(/\s+-\s+.*$/, "");
  const prefix = TYPE_PREFIXES.find(([re]) => re.test(n))?.[0];
  const rest = prefix ? n.replace(prefix, "").trim() : n;
  const words: string[] = [];
  for (const raw of rest.split(/\s+/)) {
    const w = clean(raw.split("/")[0]);
    if (raw.startsWith("(")) break;
    if (!words.length && (/^D[AEO]S?$/.test(w) || (COLOR_SET.has(w) && !isSpec(w)))) {
      words.push(w);
      continue;
    }
    if (!w || isSpec(w) || STOP_WORDS.has(w) || raw.includes(".") || COLOR_SET.has(w) || COLOR_WORDS.some(([c]) => c.includes(" ") && rest.includes(`${w} ${c.split(" ")[1]}`) && c.startsWith(w))) break;
    words.push(w);
    if (words.length === 3 || raw.includes("/")) break;
  }
  return titleCase(words.join(" "), true);
}

/** Acabamento lido do nome: o par "COR/COR" ou as palavras de cor, na ordem em que aparecem. */
export function finishFromName(name: string): string {
  const n = ` ${name.toUpperCase().replace(/\s+-\s+.*$/, "")} `;
  const found: Array<[number, string]> = [];
  let rest = n;
  for (const [w, label] of COLOR_WORDS) {
    const re = new RegExp(`(?<=[\\s/-])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.?(?=[\\s/.\\d-]|[DCLPA]\\d|$)`);
    const m = rest.match(re);
    if (m && m.index != null) {
      found.push([m.index, label]);
      rest = rest.slice(0, m.index) + " ".repeat(m[0].length) + rest.slice(m.index + m[0].length);
    }
  }
  const labels = found.sort((a, b) => a[0] - b[0]).map((f) => f[1]);
  if (!labels.length) return "";
  return labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)!.toLowerCase()}`;
}

/** "D45XA42CM" → "Ø 45 × 42 cm"; "L444XP230XA430MM" → "44,4 × 23 × 43 cm". */
export function dimsFromName(name: string): string {
  const m = name.toUpperCase().match(/(?:(?<![\w.,])|(?<=[A-Z.])(?=[DCLPA]\d))((?:[DCLPA]?\d+(?:[.,]\d+)?X)+[DCLPA]?\d+(?:[.,]\d+)?)\s*(CM|MM)?\b/);
  if (!m) {
    const d = name.toUpperCase().match(/(?:(?<![\w.,])|(?<=[A-Z]))D(\d+(?:[.,]\d+)?)\s*CM\b/);
    return d ? `Ø ${d[1].replace(".", ",")} cm` : "";
  }
  const unit = m[2] ?? (/\d{3,}/.test(m[1]) ? "MM" : "CM");
  const parts = m[1].split("X").map((p) => {
    const k = p.match(/^([DCLPA]?)([\d.,]+)$/);
    if (!k) return p;
    let v = Number(k[2].replace(",", "."));
    if (unit === "MM") v = v / 10;
    const num = v.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return k[1] === "D" ? `Ø ${num}` : num;
  });
  return `${parts.join(" × ")} cm`;
}

/** Ficha técnica tirada do nome. Só o que o nome diz com segurança. */
export function specsFromName(name: string): Record<string, string> {
  const n = name.toUpperCase().replace(/\s+-\s+.*$/, "");
  const s: Record<string, string> = {};
  const base = n.match(/(\d+)\s*X\s*-?\s*(E-?27|E-?14|E-?40|G9|GU10|GU-10|MR16|R7S|AR111|PAR\s?\d+|E-?\d{2})\b/);
  if (base) {
    s.lampadas = `${base[1]} ${Number(base[1]) > 1 ? "lâmpadas" : "lâmpada"}`;
    s.base = base[2].replace("-", "");
  }
  const watts = n.match(/(?:(\d+)\s*[X*]\s*)?(\d+(?:[.,]\d+)?)\s*W\b/);
  if (watts) s.potencia = `${watts[1] && watts[1] !== "1" ? `${watts[1]} × ` : ""}${watts[2].replace(".", ",")} W`;
  if (/\bLED\b/.test(n) && !base) s.lampadas = "LED integrado";
  const k = n.match(/\b(\d{4})\s?K\b/);
  if (k) s.temperatura = `${k[1]} K`;
  const lm = n.match(/\b(\d+)\s?LM\b/);
  if (lm) s.fluxo = `${lm[1]} lm`;
  const irc = n.match(/IRC\s?(\d{2})/);
  if (irc) s.irc = irc[1];
  const ip = n.match(/\bIP\s?(\d{2})\b/);
  if (ip) s.ip = `IP${ip[1]}`;
  if (/\bDIM\b|\bDIM\.|DIMERIZ/.test(n)) s.dimerizavel = "Sim";
  const aut = n.match(/AUTON\.?\s*(\d+)\s*H/);
  if (aut) s.bateria = `Sem fio, até ${aut[1]} h${/USB/.test(n) ? ", recarga USB-C" : ""}`;
  const d = dimsFromName(n);
  if (d) s.dimensoes = d;
  return s;
}

/* ---------------- famílias ---------------- */
/** Chave da família de um item: o SKU sem o código final de cor ou tamanho. */
export function familyKey(r: Pick<RawRow, "sku" | "name">): string {
  const sku = r.sku.toUpperCase().replace(/-CONFIG$/, "").replace(/_+$/, "");
  if (!sku) return `nome:${nameKey(r.name)}`;
  const sp = sku.split(" ");
  if (sp.length > 1) return /^[A-Z]+$/.test(sp.at(-1)!) ? sp.slice(0, -1).join(" ") : sku;
  let m = sku.match(/^([A-Z]{3}\d[A-Z]{2})\d{2}[A-Z]{2}\d+$/) ?? sku.match(/^([A-Z]{3}\d[A-Z]{2})$/);
  if (m) return m[1];
  m = sku.match(/^([A-Z]{2}\d{3,4})[A-Z]*\d?$/);
  if (m) return m[1];
  if (/^[\d.]+(-[A-Z]+)?$/.test(sku)) return `nome:${nameKey(r.name)}`;
  return sku;
}

/** Nome sem as palavras de cor do fim (para SKUs numéricos). */
export function nameKey(name: string) {
  const t = tokens(name.toUpperCase()).map(clean);
  while (t.length && (COLOR_SET.has(t.at(-1)!) || /^(DOURADO|CORAL)-/.test(t.at(-1)!))) t.pop();
  return t.join(" ").replace(/AUTON\.?\s*\d+H/g, "AUTON");
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/* ---------------- montagem ---------------- */
export function buildCatalog(rows: RawRow[], newId: () => string): { products: Product[]; report: ImportReport } {
  const report: ImportReport = { rows: rows.length, products: 0, variants: 0, published: 0, drafts: 0, noPrice: 0, inStock: 0, skipped: [], byCategory: {} };
  const parents = new Map<string, RawRow>();
  const families = new Map<string, RawRow[]>();
  const seenSku = new Set<string>();

  for (const r of rows) {
    if (/produto teste/i.test(r.name)) {
      report.skipped.push({ id: r.id, name: r.name, reason: "item de teste" });
      continue;
    }
    if (!categoryOf(r.name)) {
      report.skipped.push({ id: r.id, name: r.name, reason: "categoria não reconhecida" });
      continue;
    }
    const key = familyKey(r);
    if (r.configurable) {
      const prev = parents.get(key);
      if (!prev || (r.enabled && !prev.enabled)) parents.set(key, r);
      continue;
    }
    if (!r.sku || seenSku.has(r.sku)) {
      report.skipped.push({ id: r.id, name: r.name, reason: r.sku ? "SKU repetido" : "sem SKU" });
      continue;
    }
    seenSku.add(r.sku);
    families.set(key, [...(families.get(key) ?? []), r]);
  }

  const products: Product[] = [];
  const slugs = new Set<string>();
  for (const [key, items] of families) {
    const parent = parents.get(key);
    const first = items[0];
    const category = categoryOf(parent?.name ?? first.name)!;
    const cat = CATEGORIES.find((c) => c.slug === category)!;
    const model = modelName(parent?.name ?? first.name) || modelName(first.name) || titleCase(first.name.split(" ").slice(1, 3).join(" "), true);
    const title = `${cat.singular} ${model}`.trim();

    // opções: o que muda entre as variantes
    const finishOf = (r: RawRow) => {
      const code = r.sku.toUpperCase().split(" ").at(-1)!;
      return r.sku.includes(" ") && SKU_COLORS[code] ? SKU_COLORS[code] : finishFromName(r.name);
    };
    const base = items.map((r) => ({ r, acabamento: finishOf(r), tamanho: dimsFromName(r.name) }));
    const differs = (k: "acabamento" | "tamanho") => new Set(base.map((b) => b[k])).size > 1;
    const opts: string[] = [];
    if (differs("acabamento")) opts.push("acabamento");
    if (differs("tamanho")) opts.push("tamanho");
    const labelOf = (b: (typeof base)[number]) => opts.map((o) => b[o as "acabamento" | "tamanho"]).join("|");
    const dup = new Set(base.map(labelOf)).size < base.length || (items.length > 1 && !opts.length);
    if (dup) opts.push("versao");

    const variants: Variant[] = base.map((b) => ({
      id: newId(),
      sku: b.r.sku,
      options: Object.fromEntries(
        opts.map((o) => [o, o === "versao" ? titleCase(b.r.sku) : (b[o as "acabamento" | "tamanho"] || "Padrão")]),
      ),
      priceCents: b.r.priceCents,
      compareAtCents: null,
      stockPolicy: "estoque", // sem saldo, sai da loja; "sob encomenda" é escolha da equipe, variante por variante
      leadTimeDays: null,
      stock: Math.max(0, b.r.qty),
      active: b.r.enabled,
      legacyName: b.r.name,
    }));
    variants.sort((a, b) => (a.priceCents ?? 1e12) - (b.priceCents ?? 1e12) || a.sku.localeCompare(b.sku));

    const specs = specsFromName(first.name);
    if (opts.includes("tamanho")) delete specs.dimensoes;
    if (!opts.includes("acabamento") && base[0].acabamento) specs.acabamento = base[0].acabamento;

    // títulos repetidos ganham o que os diferencia (ex.: o tamanho ou a base)
    const anyEnabled = items.some((r) => r.enabled) && (!parent || parent.enabled || items.some((r) => r.visible && r.enabled));
    const priced = variants.some((v) => v.active && v.priceCents);
    const product: Product = {
      id: newId(),
      slug: "",
      title,
      category,
      status: anyEnabled && priced ? "publicado" : "rascunho",
      description: "",
      specs,
      options: opts,
      variants,
      media: [],
      legacy: { names: [...new Set([parent?.name, ...items.map((r) => r.name)].filter((x): x is string => !!x))], key },
    };
    products.push(product);
  }

  // títulos iguais: acrescenta o que diferencia cada um (comprimento, braços, cúpula, potência, medida…)
  const byTitle = new Map<string, Product[]>();
  products.forEach((p) => byTitle.set(p.title, [...(byTitle.get(p.title) ?? []), p]));
  for (const group of byTitle.values()) if (group.length > 1) disambiguate(group, DISTINGUISHERS);
  for (const p of products) {
    let slug = slugify(p.title) || slugify(p.legacy.key);
    for (let i = 2; slugs.has(slug); i++) slug = `${slugify(p.title)}-${i}`;
    slugs.add(slug);
    p.slug = slug;
    report.products++;
    report.variants += p.variants.length;
    report[p.status === "publicado" ? "published" : "drafts"]++;
    report.noPrice += p.variants.filter((v) => !v.priceCents).length;
    report.inStock += p.variants.filter((v) => v.stock > 0).length;
    report.byCategory[p.category] = (report.byCategory[p.category] ?? 0) + 1;
  }
  products.sort((a, b) => CATEGORIES.findIndex((c) => c.slug === a.category) - CATEGORIES.findIndex((c) => c.slug === b.category) || a.title.localeCompare(b.title, "pt-BR"));
  return { products, report };
}

/* ---------------- títulos repetidos ---------------- */
type Distinguisher = { flag?: boolean; of: (p: Product, name: string) => string };
const nameOf = (p: Product) => p.variants[0]?.legacyName.toUpperCase() ?? "";
const firstDim = (p: Product) => {
  const d = p.specs.dimensoes ?? dimsFromName(nameOf(p));
  if (!d) return "";
  const parts = d.replace(" cm", "").split(" × ");
  if (parts[0].startsWith("Ø")) return `${parts[0]} cm`;
  const nums = parts.map((x) => Number(x.replace(",", ".")));
  return `${parts[nums.indexOf(Math.max(...nums))]} cm`;
};
const DISTINGUISHERS: Distinguisher[] = [
  {
    of: (_, n) => {
      const m = n.match(/\b(\d(?:,\d+)?)M\b/);
      return m && Number(m[1].replace(",", ".")) <= 3 ? `${m[1]} m` : "";
    },
  },
  { of: (_, n) => n.match(/\b(\d+) BRAÇOS\b/)?.[1].concat(" braços") ?? "" },
  { flag: true, of: (_, n) => (/\bC\/RABICHO\b/.test(n) ? "com rabicho" : /\bS\/RABICHO\b/.test(n) ? "sem rabicho" : "") },
  { flag: true, of: (_, n) => (/\bMINI\b(?!\s*(BULBO|CÚP))/.test(n) ? "Mini" : /\bPICCOLA\b/.test(n) ? "Piccola" : "") },
  { flag: true, of: (_, n) => (/\bQUAD\b|QUAD\./.test(n) ? "quadrada" : "") },
  { flag: true, of: (_, n) => (/C[ÚU]P\.?\s?METAL/.test(n) ? "cúpula de metal" : "") },
  { of: (p) => (/\d/.test(p.specs.lampadas ?? "") ? p.specs.lampadas! : "") },
  { of: (p) => p.specs.potencia ?? "" },
  { of: (p) => (p.options.includes("acabamento") ? "" : (p.specs.acabamento ?? "").toLowerCase()) },
  { of: (p) => firstDim(p) },
  { of: (p) => p.specs.dimensoes ?? "" },
];

/**
 * Diferencia produtos de mesmo título. Primeiro procura um traço que separe todos de uma vez
 * (comprimento, braços, cúpula, potência, medida…); senão, separa em partes e repete; sem nada, usa o código do modelo.
 */
function disambiguate(group: Product[], cands: Distinguisher[]) {
  const isDim = (c: Distinguisher) => c === DISTINGUISHERS.at(-1) || c === DISTINGUISHERS.at(-2);
  const valsOf = (c: Distinguisher) => group.map((p) => c.of(p, nameOf(p)));
  const whole = (list: Distinguisher[]) => {
    for (const c of list) {
      const vals = valsOf(c);
      if (new Set(vals).size === group.length && vals.filter((v) => !v).length <= 1) {
        group.forEach((p, i) => vals[i] && (p.title = `${p.title} ${vals[i]}`));
        return true;
      }
    }
    return false;
  };
  const split = (list: Distinguisher[]) => {
    for (const c of list) {
      const vals = valsOf(c);
      if (new Set(vals).size < 2 || (!c.flag && vals.some((v) => !v))) continue;
      const sub = new Map<string, Product[]>();
      group.forEach((p, i) => {
        if (vals[i]) p.title = `${p.title} ${vals[i]}`;
        sub.set(p.title, [...(sub.get(p.title) ?? []), p]);
      });
      const rest = cands.filter((x) => x !== c);
      for (const g of sub.values()) if (g.length > 1) disambiguate(g, rest);
      return true;
    }
    return false;
  };
  // um traço que separe todos > dividir por traços de forma (rabicho, mini, quadrada…) > medidas > dividir por números
  if (whole(cands.filter((c) => !isDim(c)))) return;
  if (split(cands.filter((c) => c.flag))) return;
  if (whole(cands.filter(isDim))) return;
  if (split(cands.filter((c) => !c.flag))) return;
  for (const p of group) {
    const code = p.legacy.key.startsWith("nome:") ? p.variants[0].sku : p.legacy.key;
    p.title = `${p.title} ${code}`;
  }
}

export function importCsv(text: string, newId: () => string = () => crypto.randomUUID()) {
  return buildCatalog(readRows(text), newId);
}

/* ---------------- fotos e vídeos por planilha ---------------- */
export type MediaRow = { sku: string; name: string; url: string };
export type MatchTarget = { id: string; title: string; key: string; names: string[]; skus: string[]; urls: string[] };
export type MediaLink = { productId: string; title: string; url: string; kind: "imagem" | "video"; visible: boolean; sku: string; note?: string };
export type MediaMatch = {
  rows: number;
  links: MediaLink[];
  unmatched: MediaRow[];
  already: number;
  shared: number;
  /** vídeos que o título no YouTube/Vimeo mandou para outro produto */
  corrected: Array<{ url: string; videoTitle: string; from: string; to: string }>;
  /** vídeos cujo título aponta para uma peça que não está no catálogo: entram ocultos */
  mismatched: Array<{ url: string; videoTitle: string; product: string }>;
};

/** Planilha de mídia: precisa de uma coluna SKU e de uma coluna de link (ex.: "URL do Video", "URL da Imagem"). */
export function isMediaCsv(text: string) {
  const head = (parseCsv(text.slice(0, 2000))[0] ?? []).map((h) => h.trim().toLowerCase());
  return head.includes("sku") && head.some((h) => h.startsWith("url") || h === "link" || h === "video" || h === "vídeo" || h === "imagem");
}

export function readMediaRows(text: string): MediaRow[] {
  const [head, ...lines] = parseCsv(text);
  const h = head.map((x) => x.trim().toLowerCase());
  const sku = h.indexOf("sku");
  const url = h.findIndex((x) => x.startsWith("url") || x === "link" || x === "video" || x === "vídeo" || x === "imagem");
  const name = h.indexOf("nome");
  if (sku < 0 || url < 0) throw new Error("A planilha precisa das colunas SKU e URL.");
  return lines
    .map((l) => ({ sku: (l[sku] ?? "").replace(/\s+/g, " ").trim(), name: name >= 0 ? (l[name] ?? "").replace(/\s+/g, " ").trim() : "", url: (l[url] ?? "").trim() }))
    .filter((r) => /^https?:\/\//i.test(r.url) && (r.sku || r.name));
}

const normName = (s: string) => s.toUpperCase().replace(/\s+-\s+.*$/, "").replace(/\s+/g, " ").trim();

/** Palavras do título com cara de código de produto (ex.: "PIC1AB01PY10", "WJ 906 PT" vira "WJ"+"906"). */
const codeTokens = (title: string) =>
  title
    .toUpperCase()
    .split(/[\s/,|()]+/)
    .map((t) => t.replace(/[^A-Z0-9.\-_]/g, ""))
    .filter((t) => /^[A-Z]{2,4}\d[A-Z0-9.\-_]{2,}$/.test(t) || /^\d\.\d{3}\.\d{4}/.test(t));

/**
 * Liga cada linha a um produto: pelo SKU da variante, pela família do SKU (ex.: "KAL1AB-config")
 * ou pelo nome da planilha antiga. Quando o título do vídeo traz o código da peça, ele vale mais que a planilha.
 * Um mesmo link apontado para produtos diferentes entra oculto, para conferir.
 */
export function matchMedia(
  targets: MatchTarget[],
  rows: MediaRow[],
  isVideo: (url: string) => boolean,
  key: (url: string) => string,
  videoTitles: Map<string, string> = new Map(),
): MediaMatch {
  const bySku = new Map<string, MatchTarget>();
  const byKey = new Map<string, MatchTarget>();
  const byName = new Map<string, MatchTarget>();
  for (const t of targets) {
    for (const s of t.skus) {
      bySku.set(s.toUpperCase(), t);
      const fk = familyKey({ sku: s, name: "" });
      if (!byKey.has(fk)) byKey.set(fk, t);
    }
    if (t.key) byKey.set(t.key.toUpperCase(), t);
    for (const n of t.names) byName.set(normName(n), t);
  }
  const fromTitle = (title: string) => {
    const codes = codeTokens(title);
    for (const c of codes) {
      const t = bySku.get(c) ?? byKey.get(familyKey({ sku: c, name: "" }).toUpperCase());
      if (t) return { t, codes };
    }
    return { t: null, codes };
  };

  const found: Array<{ t: MatchTarget; r: MediaRow; note?: string; hide?: boolean }> = [];
  const unmatched: MediaRow[] = [];
  const corrected: MediaMatch["corrected"] = [];
  const mismatched: MediaMatch["mismatched"] = [];
  for (const r of rows) {
    const t =
      (r.sku && bySku.get(r.sku.toUpperCase())) ||
      (r.sku && byKey.get(familyKey({ sku: r.sku, name: r.name }).toUpperCase())) ||
      (r.name && byName.get(normName(r.name))) ||
      null;
    const vt = videoTitles.get(r.url);
    if (vt) {
      const hit = fromTitle(vt);
      if (hit.t && hit.t.id !== t?.id) {
        if (t) corrected.push({ url: r.url, videoTitle: vt, from: t.title, to: hit.t.title });
        found.push({ t: hit.t, r, note: `Ligado pelo título do vídeo (“${vt}”)` });
        continue;
      }
      if (!hit.t && hit.codes.length && t && !hit.codes.some((c) => t.skus.some((s) => s.toUpperCase() === c))) {
        mismatched.push({ url: r.url, videoTitle: vt, product: t.title });
        found.push({ t, r, hide: true, note: `O título do vídeo indica outra peça: “${vt}”` });
        continue;
      }
    }
    if (t) found.push({ t, r });
    else unmatched.push(r);
  }
  // mesmo link em produtos diferentes: provavelmente erro na planilha
  const owners = new Map<string, Set<string>>();
  for (const { t, r } of found) owners.set(key(r.url), (owners.get(key(r.url)) ?? new Set()).add(t.id));
  const links: MediaLink[] = [];
  const seen = new Set<string>();
  let already = 0;
  for (const { t, r, note, hide } of found) {
    const k = key(r.url);
    if (t.urls.some((u) => key(u) === k) || seen.has(`${t.id}|${k}`)) {
      already++;
      continue;
    }
    seen.add(`${t.id}|${k}`);
    links.push({ productId: t.id, title: t.title, url: r.url, kind: isVideo(r.url) ? "video" : "imagem", visible: !hide && owners.get(k)!.size === 1, sku: r.sku, note });
  }
  return { rows: rows.length, links, unmatched, already, shared: links.filter((l) => !l.visible).length, corrected, mismatched };
}

/** Título público do vídeo (YouTube/Vimeo, sem chave de API). Sem rede ou sem resposta, devolve nada. */
export async function fetchVideoTitles(urls: string[], timeoutMs = 4000): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  await Promise.all(
    [...new Set(urls)].map(async (u) => {
      const api = /youtu\.?be/i.test(u)
        ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`
        : /vimeo\.com/i.test(u)
          ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(u)}`
          : null;
      if (!api) return;
      try {
        const r = await fetch(api, { signal: AbortSignal.timeout(timeoutMs) });
        if (!r.ok) return;
        const j = (await r.json()) as { title?: string };
        if (j.title) out.set(u, j.title);
      } catch {
        // sem rede: segue só com a planilha
      }
    }),
  );
  return out;
}
