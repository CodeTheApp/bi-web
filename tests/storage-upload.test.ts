import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { presignUpload, validateMediaStorageReference } from "@/server/storage";
afterEach(() => vi.unstubAllEnvs());
describe("browser S3 upload signing", () => {
  it("does not bind a non-empty browser upload to the SDK's empty-body checksum", async () => {
    vi.stubEnv("S3_BUCKET", "test-example-bucket");
    vi.stubEnv("S3_REGION", "sa-east-1");
    vi.stubEnv("S3_ACCESS_KEY_ID", "TESTKEY");
    vi.stubEnv("S3_SECRET_ACCESS_KEY", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://assets.test");
    const target = await presignUpload("midia", "video/mp4", 1234);
    const signed = new URL(target.uploadUrl);
    expect(signed.searchParams.has("x-amz-checksum-crc32")).toBe(false);
    expect(signed.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(signed.searchParams.get("X-Amz-SignedHeaders")).toContain("content-length");
    expect(target.publicUrl).toBe(`https://assets.test/${target.key}`);
  });
  it("does not let a media record claim an email attachment or another asset's key", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://assets.test");
    const key = "midia/2026/11/3e375e12-e413-44f7-8f0b-c07cf3911733.webp";
    expect(() => validateMediaStorageReference(`https://assets.test/${key}`, key)).not.toThrow();
    expect(() => validateMediaStorageReference("https://assets.test/another.webp", key)).toThrow("não correspondem");
    expect(() => validateMediaStorageReference("https://assets.test/anexos/document.pdf", "anexos/document.pdf")).toThrow("Chave");
  });
});
