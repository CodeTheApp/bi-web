import { describe, expect, it } from "vitest";
import { dimsFromName, familyKey, finishFromName, importCsv, modelName, parseCsv, specsFromName } from "@/entities/product";
import { isVideoUrl, mediaKey, parseVideo } from "@/entities/product";
import { matchMedia, readMediaRows } from "@/entities/product";
import { canSell, productSchema, summarize, toPublic } from "@/entities/product";

// Linhas no formato da exportação da loja antiga (Magento), com nomes fictícios.
const CSV = `ID,Nome,Tipo,Grupo de Atributos,SKU,Preco,Qtd,Visibilidade,Status
1,PEND LUNA BEGE 1XE27 - PE 900,Produto Configurável,Default,PE 900-config,"R$0,00",0,"Catálogo, Pesquisa",Habilitado
2,PEND LUNA PRETO 1XE27,Produto Simples,Default,PE 900 PT,"R$1.200,50",0,Não Exibir Individualmente,Habilitado
3,PEND LUNA BEGE 1XE27,Produto Simples,Default,PE 900 BE,"R$1.200,50",2,Não Exibir Individualmente,Habilitado
4,PEND LUNA OURO NOVO 1XE27,Produto Simples,Default,PE 900 OUN,"R$1.350,00",0,Não Exibir Individualmente,Habilitado
5,ARAND SOL C/RABICHO L210XP460XA506MM 1XE27 - AR 50,Produto Configurável,Default,AR 50,"R$0,00",0,"Catálogo, Pesquisa",Habilitado
6,ARAND SOL BEGE C/RABICHO L210XP460XA506MM 1XE27,Produto Simples,Default,AR 50 BE,"R$800,00",0,Não Exibir Individualmente,Habilitado
7,ARAND SOL S/RABICHO L210XP460XA506MM 1XE27 - AR 50/LD,Produto Configurável,Default,AR 50/LD,"R$0,00",0,"Catálogo, Pesquisa",Habilitado
8,ARAND SOL BEGE S/RABICHO L210XP460XA506MM 1XE27,Produto Simples,Default,AR 50/LD BE,"R$700,00",0,Não Exibir Individualmente,Habilitado
9,ABAJUR MAR LED 3W 3000K 150LM CABO USB+C AUTON. 12H DIM.D80X380MM BRANCO,Produto Simples,Default,3.650.0001,"R$194,02",0,"Catálogo, Pesquisa",Habilitado
10,ABAJUR MAR LED 3W 3000K 150LM CABO USB+C AUTON. 12H DIM.D80X380MM PRETO,Produto Simples,Default,3.650.0002,"R$194,02",0,"Catálogo, Pesquisa",Habilitado
11,SOBREPOR ROMA ESFERA PRETO/OPALINO 1XG9 D250XA125MM,Produto Simples,Default,ROM1PS01PT025,"R$479,90",0,Não Exibir Individualmente,Habilitado
12,SOBREPOR ROMA ESFERA PRETO/OPALINO 1XG9 D500XA205MM,Produto Simples,Default,ROM1PS01PT050,"R$1.372,09",0,Não Exibir Individualmente,Habilitado
13,SOBREPOR ROMA - ROM1PS,Produto Configurável,Default,ROM1PS-config,"R$0,00",0,"Catálogo, Pesquisa",Desabilitado
14,Produto teste,Produto Simples,Default,9999,"R$1,00",0,"Catálogo, Pesquisa",Habilitado
`;

let n = 0;
const run = () => importCsv(CSV, () => `id${++n}`);

describe("importação da planilha", () => {
  it("lê CSV com aspas, vírgulas e preço em reais", () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([["a", "b, c", 'd "e"'], ["1", "2", "3"]]);
  });

  it("agrupa as variantes pelo SKU e pelo nome", () => {
    expect(familyKey({ sku: "WJ 906 PT", name: "" })).toBe("WJ 906");
    expect(familyKey({ sku: "PE 900-config", name: "" })).toBe("PE 900");
    expect(familyKey({ sku: "BOW1PS01BR042", name: "" })).toBe("BOW1PS");
    expect(familyKey({ sku: "HO7616AM", name: "" })).toBe("HO7616");
    const { products, report } = run();
    expect(report.skipped.map((s) => s.reason)).toEqual(["item de teste"]);
    expect(products).toHaveLength(5);
    const luna = products.find((p) => p.legacy.key === "PE 900")!;
    expect(luna.title).toBe("Pendente Luna");
    expect(luna.options).toEqual(["acabamento"]);
    expect(luna.variants.map((v) => v.options.acabamento)).toEqual(["Bege", "Preto", "Ouro novo"]);
    expect(luna.variants[0]).toMatchObject({ priceCents: 120050, stock: 2, stockPolicy: "estoque" });
    const mar = products.find((p) => p.title === "Abajur Mar")!;
    expect(mar.variants.map((v) => v.options.acabamento).sort()).toEqual(["Branco", "Preto"]);
  });

  it("diferencia produtos de mesmo nome e respeita o status da planilha", () => {
    const { products } = run();
    expect(products.filter((p) => p.title.startsWith("Arandela Sol")).map((p) => p.title).sort()).toEqual(["Arandela Sol com rabicho", "Arandela Sol sem rabicho"]);
    const roma = products.find((p) => p.title === "Luminária de sobrepor Roma")!;
    expect(roma.options).toEqual(["tamanho"]);
    expect(roma.status).toBe("rascunho"); // configurável desabilitado na loja antiga
    expect(roma.specs.acabamento).toBe("Preto e opalino");
    for (const p of products) expect(productSchema.safeParse(p).success).toBe(true);
    expect(new Set(products.map((p) => p.slug)).size).toBe(products.length);
  });

  it("tira ficha técnica, acabamento e medidas do nome", () => {
    expect(specsFromName("ABAJUR MAR LED 3W 3000K 150LM CABO USB+C AUTON. 12H DIM.D80X380MM")).toMatchObject({
      potencia: "3 W", temperatura: "3000 K", fluxo: "150 lm", dimerizavel: "Sim", lampadas: "LED integrado", dimensoes: "Ø 8 × 38 cm",
    });
    expect(specsFromName("LUSTRE X 12 BRAÇOS 12XE27")).toMatchObject({ lampadas: "12 lâmpadas", base: "E27" });
    expect(dimsFromName("ARAND X OXIDADOL140XP258XA223MM")).toBe("14 × 25,8 × 22,3 cm");
    expect(dimsFromName("PEND X D45XA42CM")).toBe("Ø 45 × 42 cm");
    expect(finishFromName("PEND X FRENCH GOLD/BRANCO 5XE27")).toBe("French gold e branco");
    expect(modelName("ARAND DE JARDIM PICCOLA BEGE L150XP255XA233MM")).toBe("de Jardim Piccola");
  });

  it("resume preço, acabamentos e estoque para as listas", () => {
    const luna = run().products.find((p) => p.legacy.key === "PE 900")!;
    expect(summarize(luna)).toMatchObject({ minCents: 120050, maxCents: 135000, finishes: ["Bege", "Preto", "Ouro novo"], inStock: true, stock: 2 });
  });
});

describe("regra de estoque", () => {
  it("sem saldo e sem encomenda, o produto sai da loja; volta com estoque ou encomenda", () => {
    const luna = run().products.find((p) => p.legacy.key === "PE 900")!;
    expect(summarize(luna).onSale).toBe(true); // a Bege tem 2
    const zerado = { ...luna, variants: luna.variants.map((v) => ({ ...v, stock: 0 })) };
    expect(summarize(zerado).onSale).toBe(false);
    expect(zerado.variants.some(canSell)).toBe(false);
    const encomenda = { ...zerado, variants: zerado.variants.map((v, i) => (i === 0 ? { ...v, stockPolicy: "encomenda" as const } : v)) };
    expect(summarize(encomenda).onSale).toBe(true);
    expect(summarize({ ...luna, status: "rascunho" }).onSale).toBe(false);
  });
});

describe("fotos e vídeos", () => {
  it("reconhece YouTube (Shorts), Vimeo e arquivo", () => {
    expect(parseVideo("https://youtube.com/shorts/rCqfg0OZt-o")).toMatchObject({ provider: "youtube", id: "rCqfg0OZt-o", vertical: true });
    expect(parseVideo("https://www.youtube.com/watch?v=rCqfg0OZt-o&t=3")?.id).toBe("rCqfg0OZt-o");
    expect(parseVideo("https://youtu.be/rCqfg0OZt-o")?.vertical).toBe(false);
    expect(parseVideo("https://vimeo.com/123456")?.provider).toBe("vimeo");
    expect(parseVideo("https://cdn.exemplo.com/a.mp4")?.provider).toBe("arquivo");
    expect(parseVideo("https://exemplo.com/foto.jpg")).toBeNull();
    expect(mediaKey("https://www.youtube.com/shorts/rCqfg0OZt-o")).toBe(mediaKey("https://youtu.be/rCqfg0OZt-o"));
  });

  it("liga links pelo SKU, pela família e pelo nome, e esconde link repetido em produtos diferentes", () => {
    const { products } = run();
    const targets = products.map((p) => ({ id: p.id, title: p.title, key: p.legacy.key, names: p.legacy.names, skus: p.variants.map((v) => v.sku), urls: [] }));
    const csv = `ID,Nome,SKU,URL do Video
1,PEND LUNA,PE 900-config,https://youtube.com/shorts/aaaaaaaaaaa
2,ABAJUR MAR,3.650.0002,https://youtube.com/shorts/bbbbbbbbbbb
3,SOBREPOR ROMA,ROM1PS01PT050,https://youtube.com/shorts/bbbbbbbbbbb
4,PEÇA QUE NÃO EXISTE,XX 1,https://youtube.com/shorts/ccccccccccc
5,PEND LUNA,PE 900 PT,https://www.youtube.com/shorts/aaaaaaaaaaa`;
    const m = matchMedia(targets, readMediaRows(csv), isVideoUrl, mediaKey);
    expect(m.links.map((l) => [l.title, l.visible])).toEqual([
      ["Pendente Luna", true],
      ["Abajur Mar", false],
      ["Luminária de sobrepor Roma", false],
    ]);
    expect(m.already).toBe(1); // o mesmo vídeo da Luna por outro SKU
    expect(m.unmatched.map((r) => r.sku)).toEqual(["XX 1"]);
    expect(m.links.every((l) => l.kind === "video")).toBe(true);
  });

  it("a loja só recebe a mídia publicada", () => {
    const luna = run().products.find((p) => p.legacy.key === "PE 900")!;
    luna.media = [
      { url: "/a.jpg", kind: "imagem", alt: "", variantId: null, visible: false },
      { url: "/b.jpg", kind: "imagem", alt: "", variantId: null, visible: true },
    ];
    expect(toPublic(luna).media.map((m) => m.url)).toEqual(["/b.jpg"]);
    expect(summarize(luna)).toMatchObject({ cover: "/b.jpg", photos: 1, hiddenMedia: 1 });
  });
});

describe("vitrine: busca, filtros e páginas", () => {
  const make = (i: number, cat: "pendentes" | "lustres", finish: string, price: number, stock: number, video = false) =>
    toPublic({
      id: `p${i}`, slug: `p-${i}`, title: `${cat === "pendentes" ? "Pendente" : "Lustre"} Modelo ${i}`, category: cat, status: "publicado", description: "", specs: {}, options: ["acabamento"],
      variants: [{ id: `v${i}`, sku: `SKU-${i}`, options: { acabamento: finish }, priceCents: price, compareAtCents: null, stockPolicy: "estoque", leadTimeDays: null, stock, active: true, legacyName: "" }],
      media: video ? [{ url: "https://youtube.com/shorts/aaaaaaaaaaa", kind: "video", alt: "", variantId: null, visible: true }] : [],
      legacy: { names: [], key: "" },
    });
  const all = Array.from({ length: 60 }, (_, i) => make(i, i % 3 ? "pendentes" : "lustres", i % 2 ? "Preto e dourado" : "Bege", 50000 + i * 10000, (i % 4) + 1, i % 10 === 0));

  it("filtra por categoria, acabamento, preço e vídeo, com contagens por grupo", async () => {
    const { browse, readState } = await import("@/entities/product");
    const r = browse(all, readState({ categoria: "lustres", cor: ["dourado"], preco: "1000-3000" }));
    expect(r.list.every((p) => p.category === "lustres" && p.variants[0].options.acabamento === "Preto e dourado")).toBe(true);
    expect(r.list.every((p) => p.variants[0].priceCents! >= 100000 && p.variants[0].priceCents! < 300000)).toBe(true);
    expect(r.chips.map((c) => c.label)).toEqual(["Lustres", "Dourado", "R$ 1.000 a R$ 3.000"]);
    // a contagem de categorias ignora o próprio filtro de categoria
    expect(r.facets.categories.find((c) => c.id === "pendentes")!.count).toBeGreaterThan(0);
    const v = browse(all, readState({ video: "1" }));
    expect(v.total).toBe(6);
  });

  it("busca por nome e código, ordena e pagina de 24 em 24", async () => {
    const { browse, readState } = await import("@/entities/product");
    expect(browse(all, readState({ q: "modelo 12" })).list.map((p) => p.id)).toEqual(["p12"]);
    expect(browse(all, readState({ q: "sku-7" })).total).toBe(1);
    const p2 = browse(all, readState({ pagina: "2", ordem: "menor-preco" }));
    expect(p2.pages).toBe(3);
    expect(p2.list[0].id).toBe("p24");
    expect(p2.pager.map((x) => x?.n ?? "…")).toEqual([1, 2, 3]);
    expect(p2.prevHref).toBe("/loja?ordem=menor-preco#produtos");
  });
});

describe("vídeos conferidos pelo título", () => {
  it("o código no título do vídeo corrige o produto e esconde vídeo de peça que não existe", () => {
    const targets = [
      { id: "seta", title: "Abajur Seta", key: "SET1AB", names: [], skus: ["SET1AB01AZ10"], urls: [] },
      { id: "pic", title: "Abajur Piccolo", key: "MV003", names: [], skus: ["MV003B"], urls: [] },
      { id: "papaya", title: "Abajur Piccolo Papaya", key: "PIC1AB", names: [], skus: ["PIC1AB01PY10"], urls: [] },
      { id: "clochet", title: "Abajur Clochet", key: "CLO1AB", names: [], skus: ["CLO1AB01PT10"], urls: [] },
    ];
    const csv = `Nome,SKU,URL do Video
SETA,SET1AB01AZ10,https://youtube.com/shorts/BXMb_4RGEac
PICCOLO,MV003B,https://www.youtube.com/shorts/BXMb_4RGEac
CLOCHET,CLO1AB01PT10,https://www.youtube.com/shorts/bb8hxJKBT5k`;
    const titles = new Map([
      ["https://youtube.com/shorts/BXMb_4RGEac", "ABAJUR PICCOLO   PIC1AB01PY10 VIDEO"],
      ["https://www.youtube.com/shorts/BXMb_4RGEac", "ABAJUR PICCOLO   PIC1AB01PY10 VIDEO"],
      ["https://www.youtube.com/shorts/bb8hxJKBT5k", "ABAJUR CICLO   CIC1AB01FM10 1"],
    ]);
    const m = matchMedia(targets, readMediaRows(csv), isVideoUrl, mediaKey, titles);
    expect(m.links.map((l) => [l.productId, l.visible])).toEqual([
      ["papaya", true],
      ["clochet", false],
    ]);
    expect(m.corrected.map((c) => [c.from, c.to])).toEqual([
      ["Abajur Seta", "Abajur Piccolo Papaya"],
      ["Abajur Piccolo", "Abajur Piccolo Papaya"],
    ]);
    expect(m.mismatched.map((x) => x.product)).toEqual(["Abajur Clochet"]);
  });
});
