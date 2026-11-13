import { createParser } from "nuqs/server";
import type { SortingState } from "@tanstack/react-table";

export function boundedIntegerParser(min: number, max: number) {
  return createParser<number>({
    parse: (value) => {
      if (!/^\d+$/.test(value)) return null;
      const number = Number(value);
      return Number.isSafeInteger(number) && number >= min && number <= max
        ? number
        : null;
    },
    serialize: String,
  });
}

export function createSortingParser(columns: readonly string[]) {
  return createParser<SortingState>({
    parse: (value) => {
      if (!value) return [];
      const result: SortingState = [];
      for (const token of value.split(",")) {
        const [id, direction, extra] = token.split(":");
        if (
          extra !== undefined ||
          !columns.includes(id) ||
          !["asc", "desc"].includes(direction) ||
          result.some((sort) => sort.id === id)
        )
          return null;
        result.push({ id, desc: direction === "desc" });
      }
      return result;
    },
    serialize: (sorting) =>
      sorting.map(({ id, desc }) => `${id}:${desc ? "desc" : "asc"}`).join(","),
    eq: (a, b) =>
      a.length === b.length &&
      a.every(
        (sort, index) => sort.id === b[index].id && sort.desc === b[index].desc,
      ),
  });
}

export function tableQueryParsers(columns: readonly string[]) {
  return {
    page: boundedIntegerParser(1, 100_000).withDefault(1),
    size: createParser<number>({
      parse: (value) =>
        /^\d+$/.test(value) && [10, 25, 50, 100].includes(Number(value))
          ? Number(value)
          : null,
      serialize: String,
    }).withDefault(25),
    sort: createSortingParser(columns).withDefault([]),
  };
}
