import { parseAsString } from "nuqs/server";
export const mediaLibraryParsers = {
  q: parseAsString.withDefault(""),
  categoria: parseAsString.withDefault("__all"),
  foto: parseAsString,
};
