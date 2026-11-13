import type { Section, SectionKey } from "@/entities/site-content/model/schema";
import { lumiImageOf } from "@/entities/site-content/model/section-images";

/** Includes images referenced only by drafts, plus the legacy lumi photography rendered by the site. */
export function sectionUsesMedia(row: { key: SectionKey; draft: Section; published: Section }, url: string) {
  return [row.draft, row.published].some((section) => {
    if (section.image === url || section.items.some((item) => item.image?.trim() === url)) return true;
    if (row.key !== "lumi") return false;
    const images = section.items.length ? section.items.map(lumiImageOf) : [lumiImageOf(undefined, 0)];
    return images.some((image) => image.src === url);
  });
}
