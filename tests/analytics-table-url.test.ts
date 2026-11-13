import { createLoader, createSerializer } from "nuqs/server";
import { describe, expect, it } from "vitest";
import { financeSortParser, reportsSortParser } from "@/entities/shop-analytics/model/query-state";

describe("financial table URL sorting", () => {
  it("restores and serializes finance movement sorting", () => {
    const load = createLoader({ ordenar: financeSortParser });
    const value = load("?ordenar=amountCents:desc,at:asc");
    expect(value.ordenar).toEqual([{ id: "amountCents", desc: true }, { id: "at", desc: false }]);
    expect(createSerializer({ ordenar: financeSortParser })(value)).toBe("?ordenar=amountCents:desc,at:asc");
  });
  it("keeps report and finance columns scoped to their own tables", () => {
    expect(createLoader({ ordenar: reportsSortParser })("?ordenar=totalCents:desc").ordenar).toEqual([{ id: "totalCents", desc: true }]);
    expect(createLoader({ ordenar: reportsSortParser })("?ordenar=amountCents:desc").ordenar).toEqual([]);
    expect(createLoader({ ordenar: financeSortParser })("?ordenar=totalCents:desc").ordenar).toEqual([]);
    expect(createLoader({ ordenar: financeSortParser })("?ordenar=at:asc,at:desc").ordenar).toEqual([]);
  });
});
