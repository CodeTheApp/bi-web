import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/env", () => ({ hasSupabase: false }));
import { demoRepo, type DemoStore } from "@/server/admin/repo-demo";
import { demoWorkspaceKey, getDemoDataMode, getDemoWorkspaceStatus, setDemoDataMode } from "@/server/demo-workspace";
import { sectionSchema } from "@/entities/site-content";

const memory = globalThis as typeof globalThis & { __biDemo?: DemoStore; __biDemoEmpty?: DemoStore; __biDemoWorkspace?: unknown };
afterEach(() => { delete memory.__biDemo; delete memory.__biDemoEmpty; delete memory.__biDemoWorkspace; vi.unstubAllEnvs(); });

describe("isolated demonstration workspaces", () => {
  it("starts with examples, switches idempotently, and refuses production mode changes", () => {
    expect(getDemoDataMode()).toBe("examples");
    expect(demoWorkspaceKey("catalog")).toBe("catalog:examples");
    expect(setDemoDataMode("empty")).toEqual({ mode: "empty", revision: 1 });
    expect(setDemoDataMode("empty").revision).toBe(1);
    expect(setDemoDataMode("examples").revision).toBe(2);
    expect(() => setDemoDataMode("invalid" as never)).toThrow();
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("ADMIN_DEMO", "0");
    expect(() => setDemoDataMode("empty")).toThrow(/demonstração/);
    expect(getDemoWorkspaceStatus()).toEqual({ mode: "examples", revision: 2 });
  });

  it("preserves existing example edits, starts empty lists independently and restores both workspaces", async () => {
    const examples = demoRepo();
    const hero = (await examples.sections()).find((section) => section.key === "hero")!;
    await examples.saveSection("hero", { ...hero.draft, title: "Edição preservada" }, true);
    const initialUsers = await examples.users();
    expect(initialUsers).toHaveLength(7);
    expect(await demoRepo().users()).toHaveLength(7); // No re-seeding on each read.
    await examples.updateOwnProfile("u1", { name: "Perfil alterado", avatarUrl: "/img/camila.jpg" });
    setDemoDataMode("empty");
    const empty = demoRepo();
    expect(await empty.users()).toEqual([]);
    expect(await empty.projects()).toEqual([]);
    expect(await empty.media()).toEqual([]);
    expect(await empty.mediaCategories()).toEqual([]);
    expect(await empty.threads()).toEqual([]);
    expect(await empty.list("testimonials")).toEqual([]);
    expect(await empty.list("faqs")).toEqual([]);
    expect(await empty.me()).toMatchObject({ id: "u1", name: "Perfil alterado", role: "admin" });
    for (const section of await empty.sections()) { expect(sectionSchema.safeParse(section.draft).success).toBe(true); expect(section.published.visible).toBe(false); }
    const emptyProject = await empty.createProject();
    await empty.updateOwnProfile("u1", { name: "Perfil sem exemplos", avatarUrl: "" });
    expect(await empty.users()).toEqual([]); // The session identity never becomes a table fixture.
    setDemoDataMode("examples");
    expect((await demoRepo().sections()).find((section) => section.key === "hero")!.published.title).toBe("Edição preservada");
    expect(await demoRepo().me()).toMatchObject({ name: "Perfil alterado" });
    setDemoDataMode("empty");
    expect((await demoRepo().projects()).map((project) => project.id)).toEqual([emptyProject]);
    expect(await demoRepo().me()).toMatchObject({ name: "Perfil sem exemplos" });
  });

  it("keeps in-flight repository writes in their captured workspace and protects avatar references", async () => {
    const examples = demoRepo();
    setDemoDataMode("empty");
    await examples.updateOwnProfile("u1", { name: "Camila", avatarUrl: "/img/hero.jpg" });
    expect((await examples.media()).find((media) => media.url === "/img/hero.jpg")?.uses).toContain("Avatar de Camila");
    expect(await demoRepo().media()).toEqual([]);
    expect(await demoRepo().users()).toEqual([]);
    await demoRepo().addMedia({ url: "/img/avatar-teste.jpg", key: null, alt: "Avatar", width: null, height: null });
    await demoRepo().updateOwnProfile("u1", { name: "Perfil vazio", avatarUrl: "/img/avatar-teste.jpg" });
    expect((await demoRepo().media())[0].uses).toContain("Avatar de Perfil vazio");
    expect((await examples.media()).some((media) => media.url === "/img/avatar-teste.jpg")).toBe(false);
  });

  it("rejects duplicate emails and self-demotion without changing the user", async () => {
    const repo = demoRepo();
    const before = (await repo.users()).find((user) => user.id === "u1")!;
    await expect(repo.updateUser("u1", { name: "Changed", email: "atendimento@brasiliailuminacao.com.br", role: "admin", avatarUrl: "" })).rejects.toThrow(/e-mail/);
    await expect(repo.updateUser("u1", { name: "Changed", email: before.email, role: "editor", avatarUrl: "" })).rejects.toThrow(/próprio/);
    expect((await repo.users()).find((user) => user.id === "u1")).toEqual(before);
    await expect(repo.updateUser("missing", { name: "Changed", email: "changed@demo.example", role: "editor", avatarUrl: "" })).rejects.toThrow(/encontrado/);
  });
});
