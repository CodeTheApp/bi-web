import type { MediaItem } from "@/entities/admin";
import { z } from "zod";

export const DEFAULT_MEDIA_CATEGORIES = ["Residencial", "Comercial", "Equipe", "Luminárias", "Detalhes arquitetônicos"] as const;
export const mediaCategoryKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ");
export const mediaCategoryNameSchema = z.string().trim().min(1, "Dê um nome à categoria.").max(60, "Use até 60 caracteres na categoria.").transform((value) => value.replace(/\s+/g, " ")).refine((value) => !value.startsWith("__") && Boolean(mediaCategoryKey(value)), "Escolha outro nome para a categoria.");

export function canonicalMediaCategory(value: string | undefined, names: readonly string[]) {
  const key = mediaCategoryKey(value ?? "");
  if (!key) return "";
  const name = names.find((candidate) => mediaCategoryKey(candidate) === key);
  if (!name) throw new Error("Escolha uma categoria cadastrada na biblioteca.");
  return name;
}

/** Initial organization only covers the site's existing photography. New uploads stay unassigned. */
export function initialMediaCategory(url: string) {
  let path: string;
  try { path = new URL(url, "https://media.local").pathname; } catch { return ""; }
  const file = /^\/img\/([^/]+)\.(?:jpe?g|png|webp|avif)$/i.exec(path)?.[1]?.toLowerCase();
  if (!file) return "";
  if (file === "hero" || file.startsWith("apt-")) return "Residencial";
  if (/^(?:bento|vip)(?:-|$)/.test(file)) return "Comercial";
  if (file === "camila") return "Equipe";
  if (file.startsWith("prod-") || file === "pendentes") return "Luminárias";
  if (file === "escada") return "Detalhes arquitetônicos";
  return "";
}

export const mediaMetadataSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à imagem.").max(120, "Use até 120 caracteres no nome."),
  category: z.string().trim().max(60, "Use até 60 caracteres na categoria."),
  alt: z.string().trim().max(200, "Use até 200 caracteres no texto alternativo."),
});

/** Stable labels for older assets that predate the library metadata fields. */
export function mediaName(media: { name?: string; url: string }) {
  if (media.name?.trim()) return media.name.trim();
  if (media.url.startsWith("data:")) return "Imagem sem nome";
  try {
    const filename = decodeURIComponent(new URL(media.url, "https://media.local").pathname.split("/").pop() ?? "");
    return filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Imagem sem nome";
  } catch {
    return "Imagem sem nome";
  }
}

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export function filterMedia(items: MediaItem[], query: string, category = "") {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const itemCategory = item.category ?? "";
    if (category === "__uncategorized" ? Boolean(itemCategory.trim()) : category && normalize(itemCategory) !== normalize(category)) return false;
    const text = normalize([mediaName(item), item.alt, item.category, ...item.uses].join(" "));
    return terms.every((term) => text.includes(term));
  });
}

export function mediaCategories(items: Pick<MediaItem, "category">[], registered: readonly string[] = []) {
  const categories = new Map<string, string>();
  for (const item of items) {
    const category = item.category?.trim().replace(/\s+/g, " ") ?? "";
    if (category) categories.set(mediaCategoryKey(category), category);
  }
  for (const category of registered) if (category.trim()) categories.set(mediaCategoryKey(category), category.trim().replace(/\s+/g, " "));
  return [...categories.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
