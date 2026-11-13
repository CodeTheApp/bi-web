import { parseAsString } from "nuqs/server";
import { tableQueryParsers } from "@/shared/lib/url-state/table-parsers";
const table = tableQueryParsers(["name", "role", "status"]);
export const userListParsers = {
  q: parseAsString.withDefault(""),
  ...table,
  size: table.size.withDefault(5),
};
