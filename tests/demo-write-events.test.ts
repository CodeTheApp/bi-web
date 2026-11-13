import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/shared/api/supabase/env", () => ({ hasSupabase: false }));
import { demoRepo } from "@/server/admin/repo-demo";
import { adminEventBus } from "@/server/admin-events/event-bus";
import { setDemoDataMode } from "@/server/demo-workspace";
import type { AdminLiveEvent } from "@/shared/model/admin-live";
const reset = () => {
  const memory = globalThis as Record<string, unknown>;
  for (const key of [
    "__biDemo",
    "__biDemoEmpty",
    "__biDemoWorkspace",
    "__biAdminEventBus",
  ])
    delete memory[key];
};
beforeEach(reset);
afterEach(reset);

describe("actual demo repository change events", () => {
  it("does not publish on reads or repeated read acknowledgements", async () => {
    const repo = demoRepo();
    const events: AdminLiveEvent[] = [];
    const stop = adminEventBus().subscribe((event) => events.push(event));
    const unread = (await repo.threads()).find((thread) => thread.unread)!;
    await repo.thread(unread.id);
    await repo.me();
    expect(events).toEqual([]);
    await repo.markRead(unread.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      topics: ["threads"],
      workspace: "examples",
    });
    await repo.markRead(unread.id);
    await repo.markRead("missing");
    expect(events).toHaveLength(1);
    stop();
  });

  it("publishes committed changes in the captured workspace and never emits a failed user edit", async () => {
    const repo = demoRepo();
    const events: AdminLiveEvent[] = [];
    const stop = adminEventBus().subscribe((event) => events.push(event));
    setDemoDataMode("empty");
    await repo.createMediaCategory("Categoria da aba original");
    expect(events.at(-1)).toMatchObject({
      topics: ["media"],
      workspace: "examples",
    });
    const count = events.length;
    await expect(
      repo.updateUser("missing", {
        name: "Editor",
        email: "editor@example.test",
        role: "editor",
        avatarUrl: "",
      }),
    ).rejects.toThrow();
    expect(events).toHaveLength(count);
    expect(await demoRepo().mediaCategories()).toEqual([]);
    stop();
  });
});
