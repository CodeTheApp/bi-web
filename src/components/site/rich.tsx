import { Fragment, type ReactNode } from "react";

/**
 * Marcação leve usada nos textos editáveis do painel:
 *   *palavras*                → destaque (negrito; no manifesto, a palavra que acende em âmbar)
 *   [foto:/img/x.jpg|Legenda] → micro-foto dentro do texto (só no manifesto "Quem somos")
 */
const TOKEN = /(\*[^*]+\*|\[foto:[^\]|]+(?:\|[^\]]*)?\])/g;

export function rich(text: string, mode: "bold" | "manifesto" = "bold"): ReactNode {
  return text.split(TOKEN).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      const inner = part.slice(1, -1);
      return mode === "manifesto" ? <span className="hl-w" key={i}>{inner}</span> : <b key={i}>{inner}</b>;
    }
    const m = part.match(/^\[foto:([^\]|]+)(?:\|([^\]]*))?\]$/);
    if (m) {
      if (mode !== "manifesto") return null;
      const [, src, cap = ""] = m;
      return (
        <span className="pill" data-nosplit tabIndex={0} aria-label={cap ? `Ver foto: ${cap}` : "Ver foto"} key={i}>
          <span className="pi">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={{ objectPosition: "40% 22%" }} />
          </span>
          <span className="pop" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" />
            {cap && <span className="cap">{cap}</span>}
          </span>
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Parágrafos separados por linha em branco. */
export const paragraphs = (text: string) => text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);

/** Remove a marcação (para metadados e e-mails). */
export const plain = (text: string) => text.replace(/\[foto:[^\]]*\]\s?/g, "").replace(/\*([^*]+)\*/g, "$1");
