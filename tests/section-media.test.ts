import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sectionSchema } from "@/entities/site-content";
import { sectionUsesMedia } from "@/entities/site-content";
import { demoRepo, type DemoStore } from "@/server/admin/repo-demo";

const memory = globalThis as typeof globalThis & { __biDemo?: DemoStore };
afterEach(() => { delete memory.__biDemo; });

describe("section image usage", () => {
  it("protects photos present only in draft or published section items", () => {
    const row = {
      key: "lumi" as const,
      draft: sectionSchema.parse({ items: [{ title: "Cena", image: "/img/draft.jpg" }] }),
      published: sectionSchema.parse({ items: [{ title: "Cena", image: "/img/published.jpg" }] }),
    };
    expect(sectionUsesMedia(row, "/img/draft.jpg")).toBe(true);
    expect(sectionUsesMedia(row, "/img/published.jpg")).toBe(true);
    expect(sectionUsesMedia(row, "/img/unused.jpg")).toBe(false);
  });

  it("tracks the photography actually rendered for legacy lumi items", () => {
    const legacy = sectionSchema.parse({ items: [{ title: "Primeira etapa" }, { title: "Segunda etapa" }] });
    const row = { key: "lumi" as const, draft: legacy, published: legacy };
    expect(sectionUsesMedia(row, "/img/apt-2.jpg")).toBe(true);
    expect(sectionUsesMedia(row, "/img/pendentes.jpg")).toBe(true);
    expect(sectionUsesMedia(row, "/img/escada.jpg")).toBe(false);
    const empty = sectionSchema.parse({});
    expect(sectionUsesMedia({ ...row, draft: empty, published: empty }, "/img/apt-2.jpg")).toBe(true);
  });

  it("keeps a replaced fallback protected until both draft and published versions stop using it", () => {
    const legacy = sectionSchema.parse({ items: [{ title: "Etapa" }] });
    const custom = sectionSchema.parse({ items: [{ title: "Etapa", image: "/img/custom.jpg" }] });
    expect(sectionUsesMedia({ key: "lumi", draft: custom, published: legacy }, "/img/apt-2.jpg")).toBe(true);
    expect(sectionUsesMedia({ key: "lumi", draft: custom, published: custom }, "/img/apt-2.jpg")).toBe(false);
  });

  it("reports draft items and legacy lumi images as in use to the server deletion guard", async () => {
    const repo = demoRepo();
    const lumi = (await repo.sections()).find((section) => section.key === "lumi")!;
    const uploaded = await repo.addMedia({ url: "/img/lumi-only-draft.jpg", key: null, width: 100, height: 100, alt: "Cena", name: "Cena" });
    await repo.saveSection("lumi", { ...lumi.draft, items: [{ title: "Etapa", text: "", image: uploaded.url }, ...lumi.draft.items.slice(1)] }, false);
    const media = await repo.media();
    expect(media.find((image) => image.id === uploaded.id)!.uses).toContain("Luminotécnico");
    expect(media.find((image) => image.url === "/img/pendentes.jpg")!.uses).toContain("Luminotécnico");
  });
});
