import { describe, expect, it } from "vitest";
import {
  loadCatalogSearch,
  serializeCatalogSearch,
} from "@/features/catalog-filter/model/search-params";
import { hrefFor, readState } from "@/entities/product";
import { createLoader } from "nuqs/server";
import { productSearchParams } from "@/features/product-selection/model/search-params";

describe("nuqs shop URL state", () => {
  it("preserves existing repeated finish links and server filtering semantics", () => {
    const href =
      "/loja?categoria=pendentes&q=lat%C3%A3o&cor=dourado&cor=preto&pronta=1&ordem=menor-preco&pagina=3";
    const url = new URL(href, "https://loja.test");
    const query = loadCatalogSearch(url);
    const server = readState(
      Object.fromEntries(
        [...url.searchParams.keys()].map((key) => [
          key,
          url.searchParams.getAll(key),
        ]),
      ),
    );
    expect(query).toEqual({ ...server, preco: "" });
    const serialized = new URL(
      serializeCatalogSearch("/loja", query),
      "https://loja.test",
    );
    expect(serialized.searchParams.getAll("cor")).toEqual(["dourado", "preto"]);
    expect(
      readState(
        Object.fromEntries(
          [...serialized.searchParams.keys()].map((key) => [
            key,
            serialized.searchParams.getAll(key),
          ]),
        ),
      ),
    ).toEqual(server);
    expect(loadCatalogSearch(hrefFor(server, { pagina: 4 })).pagina).toBe(4);
  });

  it("validates filters and omits their defaults from a clean link", () => {
    expect(
      loadCatalogSearch(
        "?categoria=unknown&cor=invalid&ordem=oops&pagina=-8&preco=no&pronta=0",
      ),
    ).toMatchObject({
      categoria: "",
      cor: [],
      ordem: "",
      pagina: 1,
      preco: "",
      pronta: false,
    });
    expect(serializeCatalogSearch("/loja", loadCatalogSearch(""))).toBe(
      "/loja",
    );
    expect(loadCatalogSearch(`?q=${"x".repeat(100)}`).q).toHaveLength(80);
  });

  it("reads product variant and gallery deep links with a safe photo index", () => {
    const load = createLoader(productSearchParams);
    expect(load("?variante=v2&foto=3")).toEqual({ variante: "v2", foto: 3 });
    expect(load("?foto=-20")).toEqual({ variante: "", foto: 1 });
  });
});
