import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminRepo } from "@/server/admin/repo";
const state = vi.hoisted(() => ({
  mode: "examples",
  userId: "staff-a",
  authorized: true,
  shop: vi.fn(),
  writes: [] as string[],
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/demo-workspace", () => ({
  getDemoDataMode: () => state.mode,
  demoWorkspaceKey: (namespace: string, mode: string) => `${namespace}:${mode}`,
}));
vi.mock("@/server/demo-file", () => ({
  readDemo: () => null,
  writeDemoSoon: (file: string) => state.writes.push(file),
}));
vi.mock("@/server/shop/repo", () => ({ getShopRepo: state.shop }));
vi.mock("@/shared/api/supabase/server", () => ({
  createSupabaseServer: vi.fn(),
}));
vi.mock("@/server/admin/guard", () => ({
  ctx: async () => {
    if (!state.authorized) throw new Error("Sessão expirada");
    return { repo, me: { id: state.userId } };
  },
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
import {
  getAdminNotifications,
  markAdminNotificationsRead,
} from "@/server/admin-notifications/actions";
import { readNotificationFeed } from "@/server/admin-notifications/repo";
const at = new Date().toISOString();
const repo = {
  mode: "demo",
  threads: async () => [{ id: "thread" }],
  thread: async () => ({
    id: "thread",
    name: "Contato",
    subject: "Olá",
    messages: [
      { id: "incoming", direction: "in", at },
      { id: "outgoing", direction: "out", at },
    ],
  }),
} as unknown as AdminRepo;
beforeEach(() => {
  state.mode = "examples";
  state.userId = "staff-a";
  state.authorized = true;
  state.writes.length = 0;
  delete (globalThis as { __biNotificationReads?: unknown })
    .__biNotificationReads;
  state.shop
    .mockReset()
    .mockResolvedValue({
      customers: async () => [
        {
          id: "customer",
          name: "Pessoa",
          email: "person@example.com",
          createdAt: at,
        },
      ],
      allOrders: async () => [
        { id: "order", number: 1001, name: "Pessoa", createdAt: at },
      ],
    });
});
describe("staff notification feed", () => {
  it("derives stable records for signup, order and incoming messages, excluding outbound replies", async () => {
    const feed = await readNotificationFeed(
      repo,
      "staff-a",
      "notifications:examples",
    );
    expect(feed.items.map((item) => item.id).sort()).toEqual([
      "customer:customer",
      "message:incoming",
      "order:order",
    ]);
    expect(feed.items.find((item) => item.kind === "message")!.href).toBe(
      "/admin/mensagens?t=thread",
    );
  });
  it("acknowledgements are idempotent and isolated by actual authenticated staff and workspace", async () => {
    expect(
      (
        await markAdminNotificationsRead("notifications:examples", [
          "order:order",
          "order:order",
        ])
      ).ok,
    ).toBe(true);
    const first = await readNotificationFeed(
      repo,
      "staff-a",
      "notifications:examples",
    );
    expect(first.items.find((item) => item.id === "order:order")!.read).toBe(
      true,
    );
    expect(
      (
        await readNotificationFeed(repo, "staff-b", "notifications:examples")
      ).items.every((item) => !item.read),
    ).toBe(true);
    state.mode = "empty";
    expect(
      (
        await readNotificationFeed(repo, "staff-a", "notifications:empty")
      ).items.every((item) => !item.read),
    ).toBe(true);
    expect(state.writes).toEqual([
      "demo-workspace-notifications-examples-reads.json",
    ]);
  });
  it("rejects unauthenticated reads/writes before accessing records", async () => {
    state.authorized = false;
    expect((await getAdminNotifications("notifications:examples")).ok).toBe(
      false,
    );
    expect(
      (
        await markAdminNotificationsRead("notifications:examples", [
          "order:order",
        ])
      ).ok,
    ).toBe(false);
    expect(state.shop).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
  });
  it("rejects invalid keys and writes from an obsolete demo workspace", async () => {
    expect(
      (await markAdminNotificationsRead("notifications:examples", ["invalid"]))
        .ok,
    ).toBe(false);
    state.mode = "empty";
    expect(
      (
        await markAdminNotificationsRead("notifications:examples", [
          "order:order",
        ])
      ).ok,
    ).toBe(false);
    expect(state.writes).toEqual([]);
  });
  it("discards a response when the demo workspace changes during source reads", async () => {
    state.shop.mockImplementationOnce(async () => {
      state.mode = "empty";
      return { customers: async () => [], allOrders: async () => [] };
    });
    await expect(readNotificationFeed(repo, "staff-a", "notifications:examples")).rejects.toThrow("ambiente mudou");
  });
});
