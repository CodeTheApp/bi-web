/** Cor aproximada de cada acabamento, para as amostras da vitrine. Pares ("Preto e dourado") viram duas metades. */
const BASE: Array<[RegExp, string]> = [
  [/^preto|^cromo negro|^fum[eê]/i, "#1f1a17"],
  [/^branco|^off white|^opalino|^leitoso/i, "#f3eee8"],
  [/^bege|^areia|^nude/i, "#d8c3a5"],
  [/^marrom|^caf[eé]|^conhaque|^caramelo/i, "#6a4630"],
  [/^grafite/i, "#4b4846"],
  [/^cobre/i, "#b36a3e"],
  [/^corten|^terracota/i, "#8d4a2b"],
  [/^ouro novo/i, "#d2ac45"],
  [/^gold|^dourado|^french gold|^lat[aã]o|^champanhe/i, "#c6a052"],
  [/^metal ros[eé]|^ros[eé]|^rosa/i, "#c99b8b"],
  [/^platinum|^prata|^cromado|^n[ií]quel|^niquelado/i, "#c9ccce"],
  [/^oxidado|^bronze/i, "#5b4634"],
  [/^verde/i, "#56624a"],
  [/^azul/i, "#3f5670"],
  [/^amarelo|^mostarda/i, "#d8a93a"],
  [/^vermelho|^coral/i, "#b4503f"],
  [/^cinza/i, "#8f8b87"],
  [/^transparente|^transl[uú]cido|^cristal/i, "#e9eef0"],
  [/^[aâ]mbar/i, "#c4822e"],
  [/^natural|^madeira/i, "#b08a5f"],
];

const one = (s: string) => BASE.find(([re]) => re.test(s.trim()))?.[1] ?? null;

export function swatch(finish: string): string | null {
  const parts = finish.split(/,\s*|\s+e\s+/i).filter(Boolean);
  const a = one(parts[0] ?? "");
  if (!a) return null;
  const b = parts[1] ? one(parts[1]) : null;
  return b && b !== a ? `linear-gradient(135deg, ${a} 50%, ${b} 50%)` : a;
}

/** Famílias de acabamento para o filtro da vitrine ("Preto e dourado" entra em Preto e em Dourado). */
export const FINISH_FAMILIES: Array<{ id: string; label: string; re: RegExp }> = [
  { id: "preto", label: "Preto", re: /^preto|^cromo negro/i },
  { id: "branco", label: "Branco", re: /^branco|^off white|^opalino|^leitoso/i },
  { id: "bege", label: "Bege e areia", re: /^bege|^areia|^nude/i },
  { id: "dourado", label: "Dourado", re: /^gold|^dourado|^french gold|^lat[aã]o|^ouro|^champanhe/i },
  { id: "cobre", label: "Cobre e rosé", re: /^cobre|^metal ros[eé]|^ros[eé]|^rosa/i },
  { id: "marrom", label: "Marrom e bronze", re: /^marrom|^caf[eé]|^conhaque|^caramelo|^bronze|^oxidado/i },
  { id: "corten", label: "Corten e terracota", re: /^corten|^terracota/i },
  { id: "grafite", label: "Grafite e cinza", re: /^grafite|^cinza/i },
  { id: "prata", label: "Prata e cromado", re: /^platinum|^prata|^cromado|^n[ií]quel|^niquelado/i },
  { id: "cores", label: "Cores", re: /^verde|^azul|^amarelo|^mostarda|^vermelho|^coral|^roxo/i },
  { id: "vidro", label: "Vidro e transparente", re: /^transparente|^transl[uú]cido|^cristal|^fum[eê]|^[aâ]mbar/i },
  { id: "natural", label: "Natural", re: /^natural|^madeira/i },
];

export function familiesOf(finish: string): string[] {
  const parts = finish.split(/,\s*|\s+e\s+/i).filter(Boolean);
  return [...new Set(parts.flatMap((p) => FINISH_FAMILIES.filter((f) => f.re.test(p.trim())).map((f) => f.id)))];
}

export const familyColor = (id: string) =>
  ({ preto: "#1f1a17", branco: "#f3eee8", bege: "#d8c3a5", dourado: "#c6a052", cobre: "#b36a3e", marrom: "#6a4630", corten: "#8d4a2b", grafite: "#4b4846", prata: "#c9ccce", cores: "conic-gradient(#56624a 0 25%,#3f5670 0 50%,#d8a93a 0 75%,#b4503f 0)", vidro: "linear-gradient(135deg,#e9eef0,#c4822e)", natural: "#b08a5f" })[id] ?? "#ccc";
