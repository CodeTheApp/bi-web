import { describe, expect, it } from "vitest";
import { filterMedia, mediaCategories, mediaMetadataSchema, mediaName } from "@/entities/media";
import type { MediaItem } from "@/entities/admin";

const item = (id: string, details: Partial<MediaItem>): MediaItem => ({ id, name: "", category: "", url: `/img/${id}.jpg`, alt: "", width: null, height: null, createdAt: "2026-11-12", uses: [], ...details });
const media = [
  item("sala", { name: "Sala de jantar", category: "Ambientes", alt: "Pendentes sobre a mesa", uses: ["Apartamento J|R", "Hero"] }),
  item("camila", { name: "Camila de Lelis", category: "Equipe", alt: "Retrato da arquiteta" }),
  item("bento", { category: "ambientes", uses: ["Galeria Bento Viana"] }),
];

describe("media library", () => {
  it("searches name, accessibility description, category and usage without accents", () => {
    expect(filterMedia(media, "jantar").map((entry) => entry.id)).toEqual(["sala"]);
    expect(filterMedia(media, "pendentes mesa").map((entry) => entry.id)).toEqual(["sala"]);
    expect(filterMedia(media, "arquiteta").map((entry) => entry.id)).toEqual(["camila"]);
    expect(filterMedia(media, "hero").map((entry) => entry.id)).toEqual(["sala"]);
    expect(filterMedia(media, "galeria bento").map((entry) => entry.id)).toEqual(["bento"]);
    expect(filterMedia(media, "ambientes").map((entry) => entry.id)).toEqual(["sala", "bento"]);
  });

  it("combines category and search, and distinguishes uncategorized images", () => {
    expect(filterMedia(media, "retrato", "Equipe").map((entry) => entry.id)).toEqual(["camila"]);
    expect(filterMedia(media, "retrato", "Ambientes")).toEqual([]);
    expect(filterMedia([...media, item("nova", {})], "", "__uncategorized").map((entry) => entry.id)).toEqual(["nova"]);
    expect(mediaCategories(media)).toEqual(["ambientes", "Equipe"]);
  });

  it("gives older assets a filename fallback without confusing it with alt text", () => {
    expect(mediaName({ url: "/img/sala-de-jantar.webp" })).toBe("sala de jantar");
    expect(mediaName({ url: "https://cdn.example/foto%20do%20projeto.jpg?v=3" })).toBe("foto do projeto");
    expect(mediaName({ name: "Nome escolhido", url: "/img/original.jpg" })).toBe("Nome escolhido");
    expect(mediaName({ url: "data:image/jpeg;base64,AAA" })).toBe("Imagem sem nome");
    expect(filterMedia([item("sala-antiga", {})], "sala antiga")).toHaveLength(1);
  });

  it("validates and trims persisted metadata while keeping the alt description separate", () => {
    expect(mediaMetadataSchema.parse({ name: "  Sala  ", category: "  Ambientes  ", alt: "  Luz indireta  " })).toEqual({ name: "Sala", category: "Ambientes", alt: "Luz indireta" });
    expect(mediaMetadataSchema.safeParse({ name: " ", category: "", alt: "" }).success).toBe(false);
    expect(mediaMetadataSchema.safeParse({ name: "Imagem", category: "x".repeat(61), alt: "" }).success).toBe(false);
    expect(mediaMetadataSchema.safeParse({ name: "Imagem", category: "", alt: "x".repeat(201) }).success).toBe(false);
  });
});
