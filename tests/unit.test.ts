import { describe, expect, it } from "vitest";
import { design, WARM } from "@/shared/lib/cobogo";
import { contactSchema, normalizeSectionOrder, SECTION_KEYS, sectionSchema } from "@/entities/site-content";
import { seedContent } from "@/entities/site-content";
import { lumiImageOf } from "@/entities/site-content";
import { htmlToText, parseFrom, stripQuoted } from "@/shared/lib/mail-parse";

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

describe("ordem das seções", () => {
  const legacy = ["hero", "quem", "formas", "camila", "lumi", "loja", "oferta", "depoimentos", "faq", "contato"];

  it("inclui os novos blocos nos lugares originais em instalações antigas", () => {
    expect(normalizeSectionOrder(legacy)).toEqual(SECTION_KEYS);
    expect(seedContent.sectionOrder).toEqual(SECTION_KEYS);
  });

  it("preserva uma ordem publicada personalizada ao completar os novos blocos", () => {
    const custom = ["contato", ...legacy.filter((key) => key !== "contato")];
    const order = normalizeSectionOrder(custom);
    expect(order.filter((key) => custom.includes(key))).toEqual(custom);
    expect(order.indexOf("faixa")).toBe(order.indexOf("formas") - 1);
    expect(order.indexOf("cobogos")).toBe(order.indexOf("portfolio") - 1);
    expect(order.indexOf("portfolio")).toBe(order.indexOf("loja") - 1);
  });

  it("remove duplicados e chaves desconhecidas sem modificar a entrada", () => {
    const input = ["contato", "inexistente", "hero", "contato"];
    const order = normalizeSectionOrder(input);
    expect(order).toHaveLength(SECTION_KEYS.length);
    expect(new Set(order).size).toBe(SECTION_KEYS.length);
    expect(order.filter((key) => key === "contato" || key === "hero")).toEqual(["contato", "hero"]);
    expect(input).toEqual(["contato", "inexistente", "hero", "contato"]);
  });

  it("mantém uma ordem completa reordenada e usa o padrão quando não há ordem salva", () => {
    const reversed = [...SECTION_KEYS].reverse();
    expect(normalizeSectionOrder(reversed)).toEqual(reversed);
    expect(normalizeSectionOrder()).toEqual(SECTION_KEYS);
  });
});

describe("imagens das etapas", () => {
  it("mantém as fotos originais quando o conteúdo antigo não possui imagem", () => {
    expect(seedContent.sections.lumi.items.map(lumiImageOf).map((image) => image.src)).toEqual([
      "/img/apt-2.jpg", "/img/pendentes.jpg", "/img/escada.jpg", "/img/prod-1.jpg",
    ]);
  });

  it("preserva imagem e descrição personalizadas ao validar e reordenar os itens", () => {
    const section = sectionSchema.parse({
      items: [
        { title: "Primeira etapa", image: "/img/nova.jpg", imageAlt: "Sala com luz natural" },
        { title: "Segunda etapa", image: "/img/outra.jpg", imageAlt: "Luz no jardim" },
      ],
    });
    expect([...section.items].reverse().map(lumiImageOf)).toEqual([
      { src: "/img/outra.jpg", alt: "Luz no jardim" },
      { src: "/img/nova.jpg", alt: "Sala com luz natural" },
    ]);
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
