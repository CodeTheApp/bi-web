import "server-only";
import { validateUpload } from "@/shared/lib/upload-policy";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = () => process.env.S3_BUCKET ?? "";
export const hasStorage = () => Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY && process.env.NEXT_PUBLIC_MEDIA_BASE_URL);

let client: S3Client | null = null;
const s3 = () =>
  (client ??= new S3Client({
    // Presigning has no Body. The SDK default would sign an empty CRC32 and
    // reject the browser's non-empty upload with BadDigest.
    requestChecksumCalculation: "WHEN_REQUIRED",
    region: process.env.S3_REGION ?? "sa-east-1",
    credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
  }));

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png", "image/avif": "avif", "application/pdf": "pdf", "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
export const ALLOWED_TYPES = Object.keys(EXT);
export const MAX_BYTES = 15 * 1024 * 1024;

/** URL assinada (5 min) para o navegador enviar o arquivo direto ao S3, sem passar pelo servidor. */
export async function presignUpload(folder: "midia" | "anexos", contentType: string, size: number) {
  validateUpload(folder, contentType, size);
  const now = new Date();
  const key = `${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${EXT[contentType]}`;
  const uploadUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, ContentType: contentType, ContentLength: size, CacheControl: "public, max-age=31536000, immutable" }),
    { expiresIn: 300, signableHeaders: new Set(["content-type"]) },
  );
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(/\/$/, "");
  return { uploadUrl, key, publicUrl: `${base}/${key}` };
}

export async function deleteObject(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }));
}


/** A media record can only own the object produced by its media upload URL. */
export function validateMediaStorageReference(url: string, key: string | null) {
  if (!key) return;
  if (!/^midia\/\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f-]{36}\.(?:jpg|jpeg|png|webp|avif|mp4|webm|mov)$/i.test(key)) throw new Error("Chave de mídia inválida.");
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/$/, "");
  if (!base) throw new Error("Armazenamento de mídia não configurado.");
  try {
    if (new URL(url).href !== new URL(`${base}/${key}`).href) throw new Error("Endereço e chave de mídia não correspondem.");
  } catch { throw new Error("Endereço e chave de mídia não correspondem."); }
}
