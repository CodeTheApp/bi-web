import { beforeEach, describe, expect, it, vi } from "vitest";
import { INLINE_UPLOAD_LIMIT } from "@/shared/lib/upload-policy";
const mocks = vi.hoisted(() => ({ ctx: vi.fn(), add: vi.fn(), log: vi.fn(), presign: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock("@/server/admin/guard", () => ({ ctx: mocks.ctx, run: async (fn: () => Promise<unknown>) => { try { return { ok: true, data: await fn() }; } catch (error) { return { ok: false, error: (error as Error).message }; } } }));
vi.mock("@/server/admin/repo", () => ({ getRepo: vi.fn() }));
vi.mock("@/server/content", () => ({ TAGS: { content: "content", projects: "projects" } }));
vi.mock("@/server/storage", () => ({ hasStorage: () => false, presignUpload: mocks.presign, deleteObject: vi.fn(), validateMediaStorageReference: vi.fn() }));
import { createUpload, registerMedia } from "@/server/admin/actions";
const metadata = { key: null, width: 1, height: 1, alt: "", name: "Imagem", kind: "image" as const };
describe("media upload actions", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.ctx.mockResolvedValue({ repo: { mode: "demo", addMedia: mocks.add, log: mocks.log } }); mocks.add.mockImplementation(async (media) => ({ ...media, id: "media" })); mocks.log.mockResolvedValue(undefined); });
  it("lets images negotiate the smaller JPEG fallback, while rejecting oversized inline videos", async () => {
    expect(await createUpload("image/webp", INLINE_UPLOAD_LIMIT + 1)).toMatchObject({ ok: true, data: { mode: "inline" } });
    expect(await createUpload("video/mp4", INLINE_UPLOAD_LIMIT + 1)).toMatchObject({ ok: false, error: expect.stringContaining("2,5 MB") });
  });
  it("checks the final decoded inline payload before persisting media", async () => {
    const encoded = Buffer.alloc(INLINE_UPLOAD_LIMIT + 1).toString("base64");
    expect(await registerMedia({ ...metadata, url: `data:image/jpeg;base64,${encoded}` })).toMatchObject({ ok: false, error: expect.stringContaining("2,5 MB") });
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.log).not.toHaveBeenCalled();
  });
  it("rejects an unlisted or mismatched embedded MIME even if no mimeType field was supplied", async () => {
    expect(await registerMedia({ ...metadata, url: "data:image/svg+xml;base64,AQID" })).toMatchObject({ ok: false, error: expect.stringContaining("Tipo") });
    expect(await registerMedia({ ...metadata, url: "data:video/mp4;base64,AQID" })).toMatchObject({ ok: false, error: expect.stringContaining("não corresponde") });
    expect(mocks.add).not.toHaveBeenCalled();
  });
  it("derives the allowed MIME for existing inline-image callers", async () => {
    expect(await registerMedia({ ...metadata, url: "data:image/jpeg;base64,/9j/" })).toMatchObject({ ok: true });
    expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ mimeType: "image/jpeg", kind: "image" }));
  });
  it("requires staff authorization before negotiating or registering an upload", async () => {
    mocks.ctx.mockRejectedValue(new Error("Sessão expirada"));
    expect(await createUpload("image/webp", 100)).toMatchObject({ ok: false });
    expect(await registerMedia({ ...metadata, url: "data:image/jpeg;base64,/9j/" })).toMatchObject({ ok: false });
    expect(mocks.presign).not.toHaveBeenCalled();
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
