import { parseAsStringLiteral } from "nuqs/server";
import { SECTION_KEYS } from "@/entities/site-content";
export const sectionSelectionParser =
  parseAsStringLiteral(SECTION_KEYS).withDefault("hero");
