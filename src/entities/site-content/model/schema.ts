import { z } from "zod";
import { storePreferencesSchema } from "@/entities/store-settings";

/** Seções editáveis da home. A ordem aqui é a ordem no site. */
export const SECTION_KEYS = [
  "hero",
  "quem",
  "faixa",
  "formas",
  "camila",
  "lumi",
  "cobogos",
  "portfolio",
  "loja",
  "oferta",
  "depoimentos",
  "faq",
  "contato",
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** Old installations keep their published order; newly editable blocks join their original neighbours. */
export function normalizeSectionOrder(
  input?: readonly string[] | null,
): SectionKey[] {
  const known = new Set<string>(SECTION_KEYS);
  const order = [
    ...new Set((input ?? []).filter((key) => known.has(key))),
  ] as SectionKey[];
  for (const [index, key] of SECTION_KEYS.entries()) {
    if (order.includes(key)) continue;
    const next = SECTION_KEYS.slice(index + 1).find((candidate) =>
      order.includes(candidate),
    );
    if (next) order.splice(order.indexOf(next), 0, key);
    else order.push(key);
  }
  return order;
}

export const SECTION_NAMES: Record<SectionKey, string> = {
  hero: "Hero",
  quem: "Quem somos",
  faixa: "Faixa de serviços",
  formas: "Formas de trabalhar",
  camila: "A assinatura",
  lumi: "Luminotécnico",
  cobogos: "Cobogós",
  portfolio: "Portfólio",
  loja: "Curadoria",
  oferta: "Também oferecemos",
  depoimentos: "Depoimentos",
  faq: "Perguntas frequentes",
  contato: "Contato",
};

export const itemSchema = z.object({
  title: z.string().max(120),
  text: z.string().max(600).default(""),
  image: z.string().optional(),
  imageAlt: z.string().max(200).optional(),
});

/** Uma forma só para todas as seções: cada seção usa os campos que fazem sentido para ela. */
export const sectionSchema = z.object({
  visible: z.boolean().default(true),
  label: z.string().max(80).default(""),
  title: z.string().max(200).default(""),
  title2: z.string().max(120).default(""),
  text: z.string().max(1200).default(""),
  cta: z.string().max(40).default(""),
  image: z.string().default(""),
  items: z.array(itemSchema).max(8).default([]),
});
export type Section = z.infer<typeof sectionSchema>;
export type Item = z.infer<typeof itemSchema>;

const webUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "Use uma URL completa iniciada por https://.");
const assetUrl = z
  .string()
  .trim()
  .max(3_600_000)
  .refine(
    (value) =>
      !value ||
      (/^\/(?!\/)/.test(value) && !/[\s\\]/.test(value)) ||
      (/^https?:\/\//i.test(value) && webUrl.safeParse(value).success) ||
      /^data:image\/(?:png|jpeg|webp|gif|avif);base64,[a-z\d+/=]+$/i.test(
        value,
      ),
    "Selecione uma imagem válida da biblioteca ou informe uma URL pública.",
  );
const publicAssetUrl = assetUrl.refine(
  (value) => !/^data:/i.test(value),
  "Ícone e imagem de compartilhamento precisam de uma URL pública. Use um arquivo já publicado ou informe sua URL.",
);

export const companySettingsSchema = z.object({
  commercialName: z
    .string()
    .trim()
    .min(2, "Informe o nome comercial.")
    .max(100)
    .default("Brasília Iluminação"),
  legalName: z.string().trim().max(160).default(""),
  address: z.string().trim().max(240).default(""),
  city: z.string().trim().max(100).default("Brasília, DF"),
  serviceHours: z.string().trim().max(240).default(""),
  mapsUrl: webUrl.default(""),
});
export type CompanySettings = z.infer<typeof companySettingsSchema>;

export const brandSettingsSchema = z.object({
  logoLight: assetUrl.default(""),
  logoDark: assetUrl.default(""),
  compactLight: assetUrl.default(""),
  compactDark: assetUrl.default(""),
  favicon: publicAssetUrl.default(""),
  ogImage: publicAssetUrl.default(""),
});
export type BrandSettings = z.infer<typeof brandSettingsSchema>;

export const settingsSchema = z.object({
  whatsapp: z.string().default("(61) 98358-3129"),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .default("contato@brasiliailuminacao.com.br"),
  instagram: z.string().default("@brasilia_iluminacao"),
  shopUrl: z.string().url().default("https://shop.brasiliailuminacao.com.br/"),
  seoTitle: z
    .string()
    .max(70)
    .default("Brasília Iluminação — Projetos e produtos de iluminação"),
  seoDescription: z.string().max(160).default(""),
  // Optional output keeps older seed/fixture objects compatible; normalizeSettings fills runtime defaults.
  company: companySettingsSchema.optional(),
  brand: brandSettingsSchema.optional(),
  store: storePreferencesSchema.optional(),
});
export type Settings = z.infer<typeof settingsSchema>;

export const galleryLayout = z.enum(["cheia", "par", "faixa"]);
export type GalleryLayout = z.infer<typeof galleryLayout>;

export type GalleryImage = { url: string; alt: string; layout: GalleryLayout };

export type Project = {
  id: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  year: string;
  summary: string;
  scope: string[];
  cover: string;
  status: "rascunho" | "publicado";
  gallery: GalleryImage[];
};

export type Testimonial = {
  id: string;
  quote: string;
  author: string;
  location: string;
  visible: boolean;
};
export type Faq = {
  id: string;
  question: string;
  answer: string;
  visible: boolean;
};

export type SiteContent = {
  sectionOrder: SectionKey[];
  sections: Record<SectionKey, Section>;
  settings: Settings;
  projects: Project[];
  testimonials: Testimonial[];
  faqs: Faq[];
};

export const contactSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(120),
  contato: z.string().trim().min(5, "Informe e-mail ou WhatsApp").max(160),
  cidade: z.string().trim().max(80).optional().default(""),
  busca: z.string().trim().max(60).optional().default(""),
  msg: z.string().trim().max(4000).optional().default(""),
  website: z.string().max(0).optional(), // honeypot: precisa ficar vazio
});
export type ContactInput = z.infer<typeof contactSchema>;

export const THREAD_STATUS = [
  "novo",
  "andamento",
  "respondido",
  "arquivado",
] as const;
export type ThreadStatus = (typeof THREAD_STATUS)[number];
