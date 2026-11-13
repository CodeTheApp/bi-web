import { describe, expect, it } from "vitest";
import { validateUpload, IMAGE_UPLOAD_LIMIT, VIDEO_UPLOAD_LIMIT } from "@/shared/lib/upload-policy";
describe("media upload policy", () => {
  it("allows direct video upload with a separate limit from images", () => { expect(validateUpload("midia", "video/mp4", VIDEO_UPLOAD_LIMIT).video).toBe(true); expect(() => validateUpload("midia", "video/mp4", VIDEO_UPLOAD_LIMIT + 1)).toThrow("100 MB"); expect(() => validateUpload("midia", "image/jpeg", IMAGE_UPLOAD_LIMIT + 1)).toThrow("15 MB"); });
  it("restricts unsupported, empty and attachment media before signing any URL", () => { expect(() => validateUpload("midia", "image/svg+xml", 100)).toThrow("Tipo"); expect(() => validateUpload("midia", "image/webp", 0)).toThrow("vazio"); expect(() => validateUpload("anexos", "video/webm", 100)).toThrow("Tipo"); expect(validateUpload("anexos", "application/pdf", 100).video).toBe(false); });
});

import { INLINE_UPLOAD_LIMIT, validateInlineMedia } from "@/shared/lib/upload-policy";
it("checks the declared inline format, media kind and decoded bytes", () => {
  expect(validateInlineMedia("data:image/jpeg;base64,AQID", "image")).toEqual({ mimeType: "image/jpeg", size: 3 });
  expect(() => validateInlineMedia("data:image/svg+xml;base64,AQID", "image")).toThrow("Tipo");
  expect(() => validateInlineMedia("data:video/mp4;base64,AQID", "image")).toThrow("não corresponde");
  expect(() => validateInlineMedia("data:image/jpeg;base64,AQID", "image", "image/png")).toThrow("não corresponde");
  expect(() => validateInlineMedia("data:image/jpeg;base64,A", "image")).toThrow("inválido");
  const encoded = Buffer.alloc(INLINE_UPLOAD_LIMIT + 1).toString("base64");
  expect(() => validateInlineMedia(`data:image/jpeg;base64,${encoded}`, "image")).toThrow("2,5 MB");
});
