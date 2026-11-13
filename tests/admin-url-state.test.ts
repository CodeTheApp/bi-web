import { createLoader, createSerializer } from "nuqs/server";
import { describe, expect, it } from "vitest";
import { customerListParsers } from "@/features/manage-customers";
import { inboxParsers } from "@/features/manage-inbox";
import { orderListParsers } from "@/features/manage-orders";
import { productListParsers } from "@/features/manage-products";
import { stockListParsers } from "@/features/manage-stock";
import { mediaLibraryParsers } from "@/features/media-library";
import { sectionSelectionParser } from "@/features/page-editor";
import {
  boundedIntegerParser,
  createSortingParser,
} from "@/shared/lib/url-state/table-parsers";
import {
  updatePagination,
  updateSorting,
} from "@/shared/lib/url-state/table-state";

describe("admin URL state", () => {
  it("restores a product list with filters, sorting and pagination", () => {
    const load = createLoader(productListParsers);
    const state = load(
      "?q=arandela&categoria=arandelas&status=na-loja&midia=sem-foto&page=3&size=50&sort=title:asc,stock:desc",
    );
    expect(state).toEqual({
      q: "arandela",
      categoria: "arandelas",
      status: "na-loja",
      midia: "sem-foto",
      page: 3,
      size: 50,
      sort: [
        { id: "title", desc: false },
        { id: "stock", desc: true },
      ],
    });
  });

  it("rejects invalid enum values, page sizes and unknown sort columns", () => {
    expect(
      createLoader(productListParsers)(
        "?categoria=invalid&status=invalid&midia=invalid&page=-2&size=1e2&sort=password:asc",
      ),
    ).toEqual({
      q: "",
      categoria: "todas",
      status: "todos",
      midia: "toda",
      page: 1,
      size: 25,
      sort: [],
    });
    expect(createLoader(orderListParsers)("?status=invalid").status).toBe(
      "abertos",
    );
    expect(createLoader(stockListParsers)("?status=invalid").status).toBe(
      "saldo",
    );
    expect(
      createLoader({ secao: sectionSelectionParser })("?secao=invalid").secao,
    ).toBe("hero");
  });

  it("changes inbox selection without losing search or other parameters", () => {
    const serialize = createSerializer(inboxParsers);
    const next = serialize(
      "/admin/mensagens?q=Camila&caixa=novo&origem=dashboard",
      { t: "thread-1" },
    );
    expect(
      createLoader(inboxParsers)(new URL(next, "https://example.test")),
    ).toEqual({ q: "Camila", caixa: "novo", t: "thread-1" });
    expect(
      new URL(next, "https://example.test").searchParams.get("origem"),
    ).toBe("dashboard");
    const closed = serialize(next, { t: null });
    expect(
      createLoader(inboxParsers)(new URL(closed, "https://example.test")),
    ).toEqual({ q: "Camila", caixa: "novo", t: null });
  });

  it("removes defaults while retaining other URL state", () => {
    const serialize = createSerializer(productListParsers);
    const next = serialize("?origem=dashboard&page=4&status=na-loja", {
      page: 1,
      status: "todos",
    });
    const params = new URL(next, "https://example.test").searchParams;
    expect(params.get("origem")).toBe("dashboard");
    expect(params.has("page")).toBe(false);
    expect(params.has("status")).toBe(false);
  });

  it("shares a selected media by its stable ID", () => {
    expect(
      createLoader(mediaLibraryParsers)(
        "?q=luz&categoria=Produtos&foto=photo-2",
      ),
    ).toEqual({ q: "luz", categoria: "Produtos", foto: "photo-2" });
    expect(
      createLoader(customerListParsers)(
        "?q=Camila&page=2&sort=spentCents:desc",
      ),
    ).toMatchObject({
      q: "Camila",
      page: 2,
      sort: [{ id: "spentCents", desc: true }],
    });
  });
});

describe("controlled table URL parsers", () => {
  it("accepts only whole pages within the supported range", () => {
    const parser = boundedIntegerParser(1, 100_000);
    expect(parser.parse("100000")).toBe(100_000);
    for (const value of [
      "0",
      "-1",
      "1.5",
      "1e2",
      " 2",
      "100001",
      "9007199254740992",
    ])
      expect(parser.parse(value)).toBeNull();
  });

  it("rejects duplicate or malformed sorts and round-trips multi-sort", () => {
    const parser = createSortingParser(["name", "stock"]);
    const sorting = [
      { id: "name", desc: false },
      { id: "stock", desc: true },
    ];
    expect(parser.parse(parser.serialize(sorting))).toEqual(sorting);
    for (const value of [
      "name:up",
      "missing:asc",
      "name:asc,name:desc",
      "name:asc:",
      "name:asc:extra",
      "name",
    ])
      expect(parser.parse(value)).toBeNull();
  });

  it("converts TanStack functional updates without dropping page size", () => {
    expect(
      updatePagination(
        (previous) => ({ ...previous, pageIndex: previous.pageIndex + 1 }),
        { page: 3, size: 50 },
      ),
    ).toEqual({ page: 4, size: 50 });
    expect(
      updatePagination({ pageIndex: 0, pageSize: 100 }, { page: 3, size: 50 }),
    ).toEqual({ page: 1, size: 100 });
    expect(
      updateSorting(
        (previous) => [...previous, { id: "stock", desc: true }],
        [{ id: "name", desc: false }],
      ),
    ).toEqual([
      { id: "name", desc: false },
      { id: "stock", desc: true },
    ]);
  });
});
