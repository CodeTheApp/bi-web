"use client";
import { createUpload, registerMedia } from "@/server/admin/actions";
import { INLINE_UPLOAD_LIMIT } from "@/shared/lib/upload-policy";
import { unwrap } from "@/shared/api/result";
import type { UploadHelpers } from "@/shared/ui/kokonutui/file-upload";

const INLINE_VIDEO_LIMIT = INLINE_UPLOAD_LIMIT;
async function shrink(file: File, max: number, type = "image/webp", quality = .86) {
  const bitmap = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k); canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Não foi possível processar esta imagem.")), type, quality));
  return { blob, width: canvas.width, height: canvas.height };
}
function dataUrl(blob: Blob, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => reader.abort();
    reader.onload = () => { signal.removeEventListener("abort", abort); resolve(String(reader.result)); };
    reader.onerror = () => { signal.removeEventListener("abort", abort); reject(new Error("Não foi possível ler o arquivo.")); };
    reader.onabort = () => { signal.removeEventListener("abort", abort); reject(new DOMException("Envio cancelado", "AbortError")); };
    signal.addEventListener("abort", abort, { once: true });
    signal.throwIfAborted(); reader.readAsDataURL(blob);
  });
}
function put(url: string, blob: Blob, type: string, helpers: UploadHelpers) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();
    const cleanup = () => helpers.signal.removeEventListener("abort", abort);
    request.open("PUT", url); request.setRequestHeader("Content-Type", type);
    request.upload.onprogress = (event) => { if (event.lengthComputable) helpers.onProgress(8 + event.loaded / event.total * 86); };
    request.onload = () => { cleanup(); if (request.status >= 200 && request.status < 300) resolve(); else reject(new Error("O armazenamento recusou o envio. Tente novamente.")); };
    request.onerror = () => { cleanup(); reject(new Error("A conexão foi interrompida. Tente novamente.")); };
    request.onabort = () => { cleanup(); reject(new DOMException("Envio cancelado", "AbortError")); };
    helpers.signal.addEventListener("abort", abort, { once: true });
    helpers.signal.throwIfAborted(); request.send(blob);
  });
}
export async function uploadLibraryFile(file: File, helpers: UploadHelpers, options: { maxDimension?: number; preserveImageFormat?: boolean } = {}) {
  helpers.signal.throwIfAborted(); helpers.onProgress(2);
  const video = file.type.startsWith("video/");
  const image = video ? null : await shrink(file, options.maxDimension ?? 2400);
  const blob = image?.blob ?? file;
  const mimeType = video ? file.type : "image/webp";
  helpers.signal.throwIfAborted(); helpers.onProgress(8);
  const target = await unwrap(createUpload(mimeType, blob.size));
  let url: string, key: string | null = null, savedMime = mimeType;
  let width = image?.width ?? null, height = image?.height ?? null;
  if (target.mode === "s3") {
    await put(target.uploadUrl, blob, mimeType, helpers);
    url = target.publicUrl; key = target.key;
  } else {
    if (video && file.size > INLINE_VIDEO_LIMIT) throw new Error("Vídeos acima de 2,5 MB precisam do armazenamento S3 configurado. Envie um arquivo menor neste ambiente.");
    const inlineImage = video ? null : options.preserveImageFormat ? image : await shrink(file, 1600, "image/jpeg", .8);
    const inline = inlineImage?.blob ?? file;
    if (inlineImage) { width = inlineImage.width; height = inlineImage.height; }
    if (inline.size > INLINE_VIDEO_LIMIT) throw new Error("A imagem ficou grande demais para este ambiente. Envie uma versão menor ou configure o armazenamento S3.");
    url = await dataUrl(inline, helpers.signal); savedMime = video ? file.type : options.preserveImageFormat ? "image/webp" : "image/jpeg";
  }
  helpers.signal.throwIfAborted(); helpers.onProgress(96);
  const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 120) || "Arquivo sem nome";
  const item = await unwrap(registerMedia({ url, key, width, height, alt: "", name, kind: video ? "video" : "image", mimeType: savedMime }));
  helpers.onProgress(100);
  return item;
}
