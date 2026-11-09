import type { CategorySlug } from "@/lib/catalog/types";

/**
 * Desenho de linha para produtos ainda sem foto: uma peça por categoria, no traço fino da marca.
 * Some sozinho quando a foto é cadastrada no painel.
 */
const ART: Record<CategorySlug, React.ReactNode> = {
  pendentes: (
    <>
      <path d="M100 0v96" />
      <path d="M62 140c4-26 20-42 38-42s34 16 38 42z" />
      <path d="M93 140a7 7 0 0 0 14 0" />
    </>
  ),
  lustres: (
    <>
      <path d="M100 0v62" />
      <ellipse cx="100" cy="92" rx="56" ry="10" />
      <path d="M100 62v30M44 92c0-16 8-24 14-24M156 92c0-16-8-24-14-24M72 98v14M128 98v14M100 102v16" />
      <path d="M64 112h16l-3 14h-10zM120 112h16l-3 14h-10zM92 118h16l-3 14h-10z" />
    </>
  ),
  arandelas: (
    <>
      <rect x="38" y="70" width="14" height="40" rx="3" />
      <path d="M52 90h40c10 0 16 6 16 16" />
      <path d="M88 106h40l-8 34H96z" />
    </>
  ),
  abajures: (
    <>
      <path d="M70 66h60l14 52H56z" />
      <path d="M100 118v80M76 206h48" />
      <path d="M86 198h28l4 8H82z" />
    </>
  ),
  colunas: (
    <>
      <path d="M78 26h44l10 40H68z" />
      <path d="M100 66v164M72 236h56" />
      <path d="M84 230h32l4 6H80z" />
    </>
  ),
  "colunas-de-parede": (
    <>
      <rect x="34" y="60" width="12" height="36" rx="3" />
      <path d="M46 78c40 0 70 14 86 44" />
      <path d="M118 120h36l-6 30h-24z" />
    </>
  ),
  plafons: (
    <>
      <path d="M40 60h120" />
      <path d="M58 60c0 26 18 40 42 40s42-14 42-40" />
      <path d="M78 78h44" opacity=".5" />
    </>
  ),
  sobrepor: (
    <>
      <path d="M40 60h120" />
      <path d="M86 60v6h28v-6" />
      <circle cx="100" cy="104" r="38" />
      <path d="M74 112c8 10 18 14 26 14" opacity=".5" />
    </>
  ),
  spots: (
    <>
      <path d="M40 60h120" />
      <path d="M92 60v14h16V60" />
      <path d="M84 82l32-8 14 40-32 8z" />
      <path d="M104 124l10 26M118 120l18 22" opacity=".45" />
    </>
  ),
  modulos: (
    <>
      <rect x="54" y="54" width="92" height="92" rx="6" />
      <rect x="72" y="72" width="56" height="56" rx="3" />
      <path d="M100 72v56M72 100h56" opacity=".5" />
    </>
  ),
};

export function ProductArt({ category, className }: { category: CategorySlug; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 250" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ART[category] ?? ART.pendentes}
    </svg>
  );
}
