import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem } from "@/entities/admin";
const state = vi.hoisted(() => ({
  ctx: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/emails/ContactEmails", () => ({ ReplyEmail: () => null }));
vi.mock("@/server/email", () => ({
  EMAIL_FROM: "",
  hasEmail: false,
  sendEmail: vi.fn(),
  threadReplyTo: vi.fn(),
}));
vi.mock("@/server/content", () => ({
  TAGS: { content: "content", projects: "projects" },
}));
vi.mock("@/server/storage", () => ({
  deleteObject: vi.fn(),
  hasStorage: () => false,
  presignUpload: vi.fn(),
}));
vi.mock("@/server/admin/repo", () => ({ getRepo: vi.fn() }));
vi.mock("@/server/admin/guard", () => ({
  ctx: state.ctx,
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
import { deleteListItem, saveList } from "@/server/admin/actions";
const id = "89a0e285-7cf5-4c36-91c5-85f0b95a301a";
const restoredId = "ff6a7fe1-40de-4aee-9bfc-f6de715d28a8";
const items: ListItem[] = [
  { id, a: "Excluir só este", b: "Resposta", visible: true },
  {
    id: restoredId,
    a: "Pergunta recuperada em outra aba",
    b: "Outra resposta",
    visible: true,
  },
];
describe("confirmed list deletion actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ctx.mockResolvedValue({
      repo: {
        list: state.list,
        saveList: state.save,
        deleteListItem: state.remove,
      },
    });
    state.list.mockResolvedValue(items);
    state.save.mockResolvedValue(items);
    state.remove.mockResolvedValue(undefined);
  });
  it("deletes just the confirmed ID and returns the up-to-date list, retaining recovered rows", async () => {
    state.list.mockResolvedValue([items[1]]);
    expect(await deleteListItem("faqs", id, id)).toEqual({
      ok: true,
      data: [items[1]],
    });
    expect(state.remove).toHaveBeenCalledWith("faqs", id);
    expect(state.save).not.toHaveBeenCalled();
  });
  it("does not delete when the exact ID was not confirmed", async () => {
    expect((await deleteListItem("faqs", id, restoredId)).ok).toBe(false);
    expect(state.remove).not.toHaveBeenCalled();
  });
  it("sends stale autosaves as updates without granting implicit creation or deletion", async () => {
    expect(await saveList("faqs", [items[0]])).toEqual({
      ok: true,
      data: items,
    });
    expect(state.save).toHaveBeenCalledWith("faqs", [items[0]], []);
    expect(state.remove).not.toHaveBeenCalled();
  });
  it("passes only explicitly declared creation IDs to the repository", async () => {
    expect(
      (await saveList("faqs", items, { createIds: [restoredId] })).ok,
    ).toBe(true);
    expect(state.save).toHaveBeenCalledWith("faqs", items, [restoredId]);
  });
  it("rejects a creation ID absent from the submitted rows", async () => {
    expect(
      (await saveList("faqs", [items[0]], { createIds: [restoredId] })).ok,
    ).toBe(false);
    expect(state.save).not.toHaveBeenCalled();
  });
  it("rejects duplicated row and creation IDs", async () => {
    expect((await saveList("faqs", [items[0], items[0]])).ok).toBe(false);
    expect((await saveList("faqs", items, { createIds: [id, id] })).ok).toBe(
      false,
    );
    expect(state.save).not.toHaveBeenCalled();
  });
  it("requires a staff session before changing data", async () => {
    state.ctx.mockRejectedValueOnce(new Error("Sessão expirada"));
    expect((await deleteListItem("testimonials", id, id)).ok).toBe(false);
    expect(state.remove).not.toHaveBeenCalled();
  });
});
