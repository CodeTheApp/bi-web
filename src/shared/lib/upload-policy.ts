export const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/webp", "image/png", "image/avif"] as const;
export const VIDEO_UPLOAD_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export const IMAGE_UPLOAD_LIMIT = 15 * 1024 * 1024;
export const VIDEO_UPLOAD_LIMIT = 100 * 1024 * 1024;
export const INLINE_UPLOAD_LIMIT = 2500 * 1024;
export function validateUpload(folder: "midia" | "anexos", type: string, size: number) {
  const video = (VIDEO_UPLOAD_TYPES as readonly string[]).includes(type);
  const allowed = (IMAGE_UPLOAD_TYPES as readonly string[]).includes(type) || (folder === "midia" && video) || (folder === "anexos" && type === "application/pdf");
  if (!allowed) throw new Error(folder === "anexos" ? "Tipo não permitido. Use JPG, PNG, WebP, AVIF ou PDF." : "Tipo não permitido. Use JPG, PNG, WebP, AVIF, MP4, WebM ou MOV.");
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error("Arquivo vazio ou tamanho inválido.");
  const limit = video ? VIDEO_UPLOAD_LIMIT : IMAGE_UPLOAD_LIMIT;
  if (size > limit) throw new Error(`Arquivo maior que ${video ? 100 : 15} MB.`);
  return { video, limit };
}

/** Validate inline payload metadata as well as its decoded byte count. */
export function validateInlineMedia(url: string, kind: "image" | "video", expectedMime?: string) {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(url);
  if (!match || match[2].length % 4 !== 0) throw new Error("Conteúdo embutido inválido.");
  const mimeType = match[1].toLowerCase();
  const padding = match[2].endsWith("==") ? 2 : match[2].endsWith("=") ? 1 : 0;
  const size = match[2].length / 4 * 3 - padding;
  const policy = validateUpload("midia", mimeType, size);
  if (policy.video !== (kind === "video") || (expectedMime && expectedMime !== mimeType)) throw new Error("O formato não corresponde ao tipo do arquivo.");
  if (size > INLINE_UPLOAD_LIMIT) throw new Error("Arquivo maior que 2,5 MB para envio embutido.");
  return { mimeType, size };
}
