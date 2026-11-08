import type { Settings } from "@/lib/content/schema";

export const waLink = (s: Settings, text?: string) => {
  const digits = s.whatsapp.replace(/\D/g, "");
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};
export const igLink = (s: Settings) => `https://instagram.com/${s.instagram.replace(/^@/, "")}`;
