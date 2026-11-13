import { z } from "zod";
import { SECTION_KEYS, sectionSchema, type Section, type SectionKey } from "@/entities/site-content";

export const previewReadySchema = z.object({ type: z.literal("bi:preview:ready"), key: z.enum(SECTION_KEYS) });
export const previewDraftSchema = z.object({ type: z.literal("bi:preview:draft"), key: z.enum(SECTION_KEYS), revision: z.number().int().nonnegative(), draft: sectionSchema });

/** Bound both browsing context and origin before interpreting an editor message. */
export function readPreviewDraft(data: unknown, origin: string, expectedOrigin: string, source: unknown, expectedSource: unknown, key: SectionKey) {
  if (origin !== expectedOrigin || !source || source !== expectedSource) return null;
  const result = previewDraftSchema.safeParse(data);
  return result.success && result.data.key === key ? result.data : null;
}
export function draftMessage(key: SectionKey, draft: Section, revision: number) {
  return { type: "bi:preview:draft" as const, key, draft, revision };
}
