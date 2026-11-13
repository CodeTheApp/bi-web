import type { Item } from "@/entities/site-content/model/schema";

/** Existing photography remains the fallback for sections saved before item images were editable. */
const LUMI_IMAGES = [
  ["/img/apt-2.jpg", "Sala de estar com cortinas e luz indireta"],
  ["/img/pendentes.jpg", "Pendentes esféricos iluminando sala de jantar"],
  ["/img/escada.jpg", "Escada helicoidal iluminada por pendentes"],
  ["/img/prod-1.jpg", "Luminária de mesa em bronze"],
] as const;

export function lumiImageOf(item: Pick<Item, "title" | "image" | "imageAlt"> | undefined, index: number) {
  const [fallback, description] = LUMI_IMAGES[index % LUMI_IMAGES.length];
  const custom = item?.image?.trim();
  return { src: custom || fallback, alt: item?.imageAlt?.trim() || (custom ? item?.title || description : description) };
}
