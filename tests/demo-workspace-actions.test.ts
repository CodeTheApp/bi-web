import { afterEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ enabled: true, ctx: vi.fn(), tag: vi.fn(), path: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: auth.tag, revalidatePath: auth.path }));
vi.mock("@/server/admin/repo", () => ({ demoAllowed: () => auth.enabled }));
vi.mock("@/server/content", () => ({ TAGS: { content: "content", projects: "projects" } }));
vi.mock("@/server/catalog/public", () => ({ CATALOG_TAG: "catalog" }));
vi.mock("@/server/admin/guard", () => ({ ctx: auth.ctx, run: async (fn: () => Promise<unknown>) => { try { return { ok: true, data: await fn() }; } catch (error) { return { ok: false, error: (error as Error).message }; } } }));
import { changeDemoWorkspace } from "@/features/demo-workspace/api/actions";
import { getDemoDataMode } from "@/server/demo-workspace";
afterEach(() => { delete (globalThis as { __biDemoWorkspace?: unknown }).__biDemoWorkspace; vi.clearAllMocks(); auth.enabled = true; });

describe("demo workspace mutation guard", () => {
  it("requires administrator authorization before switching or invalidating data", async () => {
    auth.ctx.mockRejectedValueOnce(new Error("Sem permissão."));
    expect(await changeDemoWorkspace("empty")).toMatchObject({ ok: false });
    expect(auth.ctx).toHaveBeenCalledWith({ admin: true });
    expect(getDemoDataMode()).toBe("examples");
    expect(auth.tag).not.toHaveBeenCalled();
  });
  it("never switches a Supabase or disabled demo environment", async () => {
    auth.ctx.mockResolvedValueOnce({ repo: { mode: "supabase" } });
    expect(await changeDemoWorkspace("empty")).toMatchObject({ ok: false });
    auth.enabled = false;
    auth.ctx.mockResolvedValueOnce({ repo: { mode: "demo" } });
    expect(await changeDemoWorkspace("empty")).toMatchObject({ ok: false });
    expect(getDemoDataMode()).toBe("examples");
    expect(auth.tag).not.toHaveBeenCalled();
  });
  it("validates input and invalidates site/catalog/layout after a successful switch", async () => {
    auth.ctx.mockResolvedValue({ repo: { mode: "demo" } });
    expect(await changeDemoWorkspace("other")).toMatchObject({ ok: false });
    expect(getDemoDataMode()).toBe("examples");
    expect(await changeDemoWorkspace("empty")).toMatchObject({ ok: true, data: { mode: "empty", revision: 1 } });
    expect(auth.tag.mock.calls.map(([tag]) => tag)).toEqual(["content", "projects", "catalog"]);
    expect(auth.path).toHaveBeenCalledWith("/", "layout");
  });
});
