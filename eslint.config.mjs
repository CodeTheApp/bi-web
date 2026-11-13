import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // O site público navega com <a> de propósito: cada página monta cenas do GSAP (pins, Lenis)
    // e uma carga completa entre home e projeto é mais previsível que a navegação no cliente.
    files: ["src/widgets/home/**", "src/widgets/site-*/**", "src/widgets/product-detail/**", "src/features/shopping/**", "src/features/catalog-filter/**", "src/_pages/**", "src/app/(site)/**"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Código dos registros do shadcn/ui e da ReUI (gerado pela CLI; só ajustes de tema)
    "src/shared/ui/*.tsx",
    "src/shared/ui/reui/**",
    "src/shared/hooks/use-file-upload.ts",
    "**/._*",
  ]),
]);

export default eslintConfig;
