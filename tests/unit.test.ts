import { describe, expect, it } from "vitest";
import { design, WARM } from "@/lib/cobogo";
import { contactSchema, sectionSchema } from "@/lib/content/schema";
import { seedContent } from "@/lib/content/seed";
import { htmlToText, parseFrom, stripQuoted } from "@/lib/mail-parse";

describe("cobogó", () => {
  it("é determinístico e usa a paleta da marca", () => {
    expect(design(3, 2)).toEqual(design(3, 2));
    for (let c = 0; c < 14; c++) for (let r = 0; r < 6; r++) expect(WARM).toContain(design(c, r).fg);
  });
});

describe("conteúdo inicial", () => {
  it("todas as seções passam no schema", () => {
    for (const s of Object.values(seedContent.sections)) expect(sectionSchema.safeParse(s).success).toBe(true);
  });
  it("slugs de projeto são únicos", () => {
    const slugs = seedContent.projects.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("formulário de contato", () => {
  it("exige nome e contato", () => {
    expect(contactSchema.safeParse({ nome: "", contato: "" }).success).toBe(false);
    expect(contactSchema.safeParse({ nome: "Ana", contato: "ana@ex.com" }).success).toBe(true);
  });
  it("rejeita o honeypot preenchido", () => {
    expect(contactSchema.safeParse({ nome: "Bot", contato: "bot@ex.com", website: "http://spam" }).success).toBe(false);
  });
});

describe("e-mails recebidos", () => {
  it("lê o remetente", () => {
    expect(parseFrom('"Mariana Costa" <Mariana@Exemplo.com>')).toEqual({ name: "Mariana Costa", address: "mariana@exemplo.com" });
    expect(parseFrom("ana@ex.com")).toEqual({ name: "", address: "ana@ex.com" });
  });
  it("corta o histórico citado", () => {
    const t = "Pode ser quinta?\n\nEm qui., 6 de nov. de 2026 às 10:00, Brasília Iluminação escreveu:\n> Olá!\n> Tudo bem?";
    expect(stripQuoted(t)).toBe("Pode ser quinta?");
    expect(stripQuoted("Sure.\nOn Thu, Nov 6, 2026 at 10:00 AM X wrote:\n> hi")).toBe("Sure.");
  });
  it("converte HTML em texto", () => {
    expect(htmlToText("<p>Olá&nbsp;Camila</p><p>Tudo&amp;bem</p>")).toBe("Olá Camila\nTudo&bem");
  });
});
