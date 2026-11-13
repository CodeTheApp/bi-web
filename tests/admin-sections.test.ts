import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { SECTION_KEYS } from "@/entities/site-content";
import { seedContent } from "@/entities/site-content";
import { demoRepo, type DemoStore } from "@/server/admin/repo-demo";

const memory = globalThis as typeof globalThis & { __biDemo?: DemoStore };
afterEach(() => { delete memory.__biDemo; });

describe("home section management", () => {
  it("changes order without publishing drafts or resetting order on later edits", async () => {
    const repo = demoRepo();
    const initial = await repo.sections();
    const hero = initial.find((row) => row.key === "hero")!;
    await repo.saveSection("hero", { ...hero.draft, title: "Rascunho ainda não publicado" }, false);
    const order = [...SECTION_KEYS].reverse();
    await repo.reorderSections(order);
    await repo.setSectionVisible("contato", false);
    await repo.saveSection("quem", initial.find((row) => row.key === "quem")!.draft, true);
    const rows = await repo.sections();
    expect(rows.map((row) => row.key)).toEqual(order);
    const saved = rows.find((row) => row.key === "hero")!;
    expect(saved.draft.title).toBe("Rascunho ainda não publicado");
    expect(saved.published.title).toBe(hero.published.title);
    expect(saved.status).toBe("rascunho");
    expect(rows.find((row) => row.key === "contato")!.published.visible).toBe(false);
    expect(seedContent.sections.contato.visible).toBe(true);
  });

  it("adds newly editable blocks to legacy data without losing existing changes", async () => {
    const repo = demoRepo();
    const hero = (await repo.sections()).find((row) => row.key === "hero")!;
    await repo.saveSection("hero", { ...hero.draft, title: "Texto preservado" }, false);
    memory.__biDemo!.sections = memory.__biDemo!.sections.filter((row) => !["faixa", "cobogos", "portfolio"].includes(row.key));
    const rows = await demoRepo().sections();
    expect(rows.map((row) => row.key)).toEqual(SECTION_KEYS);
    expect(rows.find((row) => row.key === "hero")!.draft.title).toBe("Texto preservado");
    expect(rows.find((row) => row.key === "hero")!.published.title).toBe(hero.published.title);
  });
});
