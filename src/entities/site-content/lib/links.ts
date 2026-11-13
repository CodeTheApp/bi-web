import type { Settings } from "@/entities/site-content/model/schema";

export const waNumberLink = (whatsapp: string, text?: string) => {
  const digits = whatsapp.replace(/\D/g, "");
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
export const waLink = (s: Settings, text?: string) => waNumberLink(s.whatsapp, text);
export const igLink = (s: Settings) => `https://instagram.com/${s.instagram.replace(/^@/, "")}`;
