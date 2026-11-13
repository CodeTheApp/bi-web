import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DEFAULT_MEDIA_CATEGORIES, initialMediaCategory, mediaCategoryKey } from "@/entities/media";
import { demoRepo, type DemoStore } from "@/server/admin/repo-demo";

const memory = globalThis as typeof globalThis & { __biDemo?: DemoStore };
afterEach(() => { delete memory.__biDemo; });

describe("registered media categories", () => {
  it("starts with five categories and organizes the existing photography", async () => {
    const repo = demoRepo();
    expect(await repo.mediaCategories()).toEqual([...DEFAULT_MEDIA_CATEGORIES].sort((a, b) => a.localeCompare(b, "pt-BR")));
    const counts: Record<string, number> = {};
    for (const item of await repo.media()) counts[item.category] = (counts[item.category] ?? 0) + 1;
    expect(counts).toEqual({ Residencial: 7, Comercial: 12, Equipe: 1, "Luminárias": 5, "Detalhes arquitetônicos": 1 });
  });

  it("persists unused categories and rejects equivalent names", async () => {
    const repo = demoRepo();
    expect(await repo.createMediaCategory("  Eventos   e lançamentos  ")).toBe("Eventos e lançamentos");
    expect(await demoRepo().mediaCategories()).toContain("Eventos e lançamentos");
    expect((await repo.media()).some((item) => item.category === "Eventos e lançamentos")).toBe(false);
    await expect(repo.createMediaCategory("EVENTOS E LANCAMENTOS")).rejects.toThrow("Já existe");
    await expect(repo.createMediaCategory(" ")).rejects.toThrow();
    await expect(repo.createMediaCategory("__none")).rejects.toThrow();
  });

  it("only assigns registered categories and keeps deliberately unassigned images", async () => {
    const repo = demoRepo();
    const image = (await repo.media())[0];
    await expect(repo.updateMediaMetadata(image.id, { name: image.name, alt: image.alt, category: "Inexistente" })).rejects.toThrow("categoria cadastrada");
    await repo.updateMediaMetadata(image.id, { name: image.name, alt: image.alt, category: "LUMINARIAS" });
    expect((await repo.media())[0].category).toBe("Luminárias");
    await repo.updateMediaMetadata(image.id, { name: image.name, alt: image.alt, category: "" });
    expect((await demoRepo().media())[0].category).toBe("");
    const uploaded = await repo.addMedia({ url: "/img/hero.jpg", key: null, width: null, height: null, alt: "", name: "Novo envio" });
    expect(uploaded.category).toBe("");
  });

  it("upgrades legacy memory without overwriting chosen names or categories", async () => {
    demoRepo();
    const state = memory.__biDemo!;
    state.mediaCategoryNames = undefined;
    state.media[0].category = "  Projetos   Autorais ";
    state.media[0].name = "Nome escolhido";
    state.media[1].category = "residêncial";
    state.media[2].category = "";
    const repo = demoRepo();
    const images = await repo.media();
    expect(images[0]).toMatchObject({ name: "Nome escolhido", category: "Projetos Autorais" });
    expect(images[1].category).toBe("Residencial");
    expect(images[2].category).toBe("Residencial");
    expect(await repo.mediaCategories()).toContain("Projetos Autorais");
  });

  it("classifies only known site filenames and normalizes category keys", () => {
    expect(initialMediaCategory("https://cdn.example/img/bento-noite.webp?v=2")).toBe("Comercial");
    expect(initialMediaCategory("/uploads/hero.jpg")).toBe("");
    expect(initialMediaCategory("/img/novo-projeto.jpg")).toBe("");
    expect(mediaCategoryKey("  LUMINÁRIAS   técnicas  ")).toBe("luminarias tecnicas");
  });
});
