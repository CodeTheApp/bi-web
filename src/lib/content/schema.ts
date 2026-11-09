import { z } from "zod";

/** Seções editáveis da home. A ordem aqui é a ordem no site. */
export const SECTION_KEYS = ["hero", "quem", "formas", "camila", "lumi", "loja", "oferta", "depoimentos", "faq", "contato"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_NAMES: Record<SectionKey, string> = {
  hero: "Hero",
  quem: "Quem somos",
  formas: "Formas de trabalhar",
  camila: "A assinatura",
  lumi: "Luminotécnico",
  loja: "Curadoria",
  oferta: "Também oferecemos",
  depoimentos: "Depoimentos",
  faq: "Perguntas frequentes",
  contato: "Contato",
};

export const itemSchema = z.object({
  title: z.string().max(120),
  text: z.string().max(600).default(""),
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

export const settingsSchema = z.object({
  whatsapp: z.string().default("(61) 98358-3129"),
  email: z.string().email().default("contato@brasiliailuminacao.com.br"),
  instagram: z.string().default("@brasilia_iluminacao"),
  shopUrl: z.string().url().default("https://shop.brasiliailuminacao.com.br/"),
  seoTitle: z.string().max(70).default("Brasília Iluminação — Projetos e produtos de iluminação"),
  seoDescription: z.string().max(160).default(""),
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

export type Testimonial = { id: string; quote: string; author: string; location: string; visible: boolean };
export type Faq = { id: string; question: string; answer: string; visible: boolean };

export type SiteContent = {
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

export const THREAD_STATUS = ["novo", "andamento", "respondido", "arquivado"] as const;
export type ThreadStatus = (typeof THREAD_STATUS)[number];
