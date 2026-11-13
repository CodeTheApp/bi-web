/**
 * Gramática das peças de cobogó (a partir dos Padrões do Manual da Marca).
 * A mesma regra desenha a parede em SVG e as peças 3D do hero.
 */
export const SHAPES = {
  quarter: "M0 100V0A100 100 0 0 1 100 100Z", // quarto de círculo cheio
  concave: "M0 0H16A84 84 0 0 0 100 84V100H0Z", // quadrado com curva côncava
  lens: "M0 100A100 100 0 0 1 100 0A100 100 0 0 1 0 100Z", // folha / lente
  half: "M0 100A50 50 0 0 1 100 100Z", // meia-lua
  bar: "M0 82H100V100H0Z", // faixa
  dot: "M0 0H20V20H0Z", // ponto quadrado
} as const;
export type ShapeKind = keyof typeof SHAPES;

/** Tons do padrão colorido do manual, do mais claro ao mais escuro. */
export const WARM = ["#F5B073", "#F29C50", "#E68907", "#B76B02", "#A56B4C", "#8E461F", "#7A574A", "#592D1D"] as const;

export type TileDesign = { kind: ShapeKind; rot: number; fg: string; idx: number; alt: boolean };

function hash(a: number, b: number) {
  let h = Math.imul(a * 374761393 + b * 668265263, 1274126177) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function design(c: number, r: number): TileDesign {
  const h = hash(c + 3, r + 7);
  const h2 = hash(c * 5 + 97, r * 3 + 11);
  const kind: ShapeKind = h < 0.36 ? "quarter" : h < 0.66 ? "concave" : h < 0.77 ? "lens" : h < 0.86 ? "half" : h < 0.94 ? "bar" : "dot";
  const rot = (c + r * 3 + (h2 > 0.8 ? 1 : 0)) % 4;
  const f = 0.5 + 0.26 * Math.sin(c * 0.42 + r * 0.18) + 0.24 * Math.cos(r * 0.55 - c * 0.21);
  const idx = Math.max(0, Math.min(WARM.length - 1, Math.floor(f * WARM.length + (h2 - 0.5) * 2.4)));
  return { kind, rot, fg: WARM[idx], idx, alt: h2 < 0.16 };
}

export function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
