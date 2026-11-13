/** Leitura de e-mails recebidos (webhook do Resend). */
export function parseFrom(from: string) {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), address: m[2].trim().toLowerCase() } : { name: "", address: from.trim().toLowerCase() };
}
export const lower = (h: Record<string, string>) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));

export function htmlToText(html: string) {
  return html
    .replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Corta o histórico citado ("Em ... escreveu:", "On ... wrote:", linhas com ">") para a caixa ficar legível. */
export function stripQuoted(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const cut = lines.findIndex((l) => /^(Em .+escreveu:|On .+wrote:|-{2,}\s*Mensagem original|De:\s.+|From:\s.+)$/i.test(l.trim()));
  const kept = (cut > 0 ? lines.slice(0, cut) : lines).filter((l, i, a) => !(l.startsWith(">") && a.slice(i).every((x) => x.startsWith(">") || !x.trim())));
  return kept.join("\n").trim();
}
