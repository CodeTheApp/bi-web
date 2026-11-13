import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createAdminEventBus } from "@/server/admin-events/event-bus";
import { createAdminEventStream } from "@/server/admin-events/stream";
import { demoFileEvent } from "@/server/admin-events/demo-file-event";
import {
  connectDemoEvents,
  parseLiveEvent,
} from "@/features/admin-live-updates/model/demo-connection";
import { createLiveInvalidator } from "@/features/admin-live-updates/model/invalidation";
import type { AdminLiveEvent } from "@/shared/model/admin-live";

afterEach(() => vi.useRealTimers());
const decode = (bytes: Uint8Array | undefined) =>
  new TextDecoder().decode(bytes);
const payload = (chunk: string): AdminLiveEvent =>
  JSON.parse(chunk.split("data: ")[1].trim());
class Source extends EventTarget {
  closed = 0;
  close() {
    this.closed++;
  }
  emit(type: string, event: AdminLiveEvent) {
    this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(event) }));
  }
}

describe("one central administrative live connection", () => {
  it("coalesces a burst into relevant query roots and cancels pending work on disconnect", () => {
    vi.useFakeTimers();
    const refresh = vi.fn();
    const invalidator = createLiveInvalidator(refresh);
    invalidator.push(["media"]);
    invalidator.push(["media", "threads"]);
    vi.advanceTimersByTime(99);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledOnce();
    expect(new Set(refresh.mock.calls[0][0])).toEqual(
      new Set(["media", "media-categories", "dashboard", "threads", "thread"]),
    );
    invalidator.push(["orders"]);
    invalidator.dispose();
    vi.advanceTimersByTime(1000);
    expect(refresh).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("journals only missed topics in the selected workspace, including a safe reset after a process restart", () => {
    const bus = createAdminEventBus();
    const start = bus.snapshot("examples");
    bus.publish(["media"], "examples");
    bus.publish(["orders"], "empty");
    bus.publish(["threads"], "examples");
    expect(bus.snapshot("examples", `${start.instance}:1`).topics).toEqual([
      "threads",
    ]);
    expect(bus.snapshot("examples", `${start.instance}:3`).topics).toEqual([]);
    expect(bus.snapshot("examples", "previous-process:100").topics).toContain(
      "media",
    );
    expect(bus.snapshot("examples").topics).toEqual([]); // Initial history never becomes a new-notification replay.
    for (let i = 0; i < 260; i++) bus.publish(["media"], "examples");
    expect(bus.snapshot("examples", `${start.instance}:0`).topics).toContain(
      "orders",
    );
  });

  it("keeps the writer's captured mode when mapping persisted commerce and read markers", () => {
    expect(demoFileEvent("demo-workspace-shop-empty.json")).toEqual({
      topics: ["orders", "customers", "coupons"],
      workspace: "empty",
    });
    expect(demoFileEvent("demo-workspace-catalog-examples.json")).toEqual({
      topics: ["products", "stock"],
      workspace: "examples",
    });
    expect(
      demoFileEvent("demo-workspace-notifications-empty-reads.json"),
    ).toEqual({ topics: ["notifications"], workspace: "empty" });
    expect(demoFileEvent("unrelated.json")).toBeNull();
  });

  it("uses native reconnect events, ignores duplicates and blocks on another tab's workspace change", () => {
    const source = new Source();
    const changed = vi.fn();
    const refresh = vi.fn();
    const disconnect = connectDemoEvents(source, refresh, changed);
    const initial: AdminLiveEvent = {
      instance: "a",
      revision: 0,
      workspace: "examples",
      topics: [],
    };
    source.emit("ready", initial);
    source.emit("change", { ...initial, revision: 1, topics: ["media"] });
    source.emit("ready", { ...initial, revision: 3, topics: ["orders"] });
    source.emit("ready", { ...initial, revision: 3, topics: ["orders"] });
    expect(refresh.mock.calls.map(([event]) => event.topics)).toEqual([
      [],
      ["media"],
      ["orders"],
    ]);
    source.emit("change", {
      ...initial,
      revision: 4,
      workspace: "empty",
      topics: ["workspace"],
    });
    expect(changed).toHaveBeenCalledOnce();
    expect(source.closed).toBe(1);
    source.emit("change", { ...initial, revision: 5, topics: ["media"] });
    expect(refresh).toHaveBeenCalledTimes(3);
    disconnect();
    expect(source.closed).toBe(1);
  });

  it("detects a workspace switch between server render and the first stream handshake", () => {
    const source = new Source();
    const changed = vi.fn();
    const refresh = vi.fn();
    connectDemoEvents(source, refresh, changed, "examples");
    source.emit("ready", {
      instance: "a",
      revision: 1,
      workspace: "empty",
      topics: [],
    });
    expect(changed).toHaveBeenCalledOnce();
    expect(refresh).not.toHaveBeenCalled();
    expect(source.closed).toBe(1);
  });

  it("cleans up stream listeners and heartbeat on abort and cancel without database polling", async () => {
    vi.useFakeTimers();
    const bus = createAdminEventBus();
    const unsubscribe = vi.fn();
    const wrapped = {
      ...bus,
      subscribe(listener: Parameters<typeof bus.subscribe>[0]) {
        const stop = bus.subscribe(listener);
        return () => {
          unsubscribe();
          stop();
        };
      },
    };
    const abort = new AbortController();
    const reader = createAdminEventStream(
      abort.signal,
      "examples",
      null,
      wrapped,
    ).getReader();
    expect(decode((await reader.read()).value)).toContain("event: ready");
    vi.advanceTimersByTime(25_000);
    expect(decode((await reader.read()).value)).toBe(": keep-alive\n\n");
    abort.abort();
    expect(await reader.read()).toMatchObject({ done: true });
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    const second = createAdminEventStream(
      new AbortController().signal,
      "empty",
      null,
      wrapped,
    ).getReader();
    await second.read();
    await second.cancel();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
    bus.publish(["media"], "empty");
  });

  it("filters other-workspace writes and includes the reconnect journal in the ready event", async () => {
    const bus = createAdminEventBus();
    const start = bus.snapshot("examples");
    bus.publish(["media"], "examples");
    const reader = createAdminEventStream(
      new AbortController().signal,
      "examples",
      `${start.instance}:0`,
      bus,
    ).getReader();
    expect(payload(decode((await reader.read()).value)).topics).toEqual([
      "media",
    ]);
    bus.publish(["orders"], "empty");
    bus.publish(["threads"], "examples");
    expect(payload(decode((await reader.read()).value)).topics).toEqual([
      "threads",
    ]);
    bus.publish(["workspace"], "empty");
    expect(payload(decode((await reader.read()).value))).toMatchObject({
      workspace: "empty",
      topics: expect.arrayContaining(["workspace", "orders"]),
    });
    bus.publish(["media"], "examples");
    bus.publish(["coupons"], "empty");
    expect(payload(decode((await reader.read()).value)).topics).toEqual([
      "coupons",
    ]);
    await reader.cancel();
  });

  it("rejects malformed stream input instead of invalidating arbitrary cache roots", () => {
    expect(parseLiveEvent("not-json")).toBeNull();
    expect(
      parseLiveEvent(
        JSON.stringify({
          instance: "a",
          revision: 1,
          workspace: "examples",
          topics: ["private-unknown"],
        }),
      ),
    ).toBeNull();
    expect(
      parseLiveEvent(
        JSON.stringify({
          instance: "a",
          revision: -1,
          workspace: "examples",
          topics: [],
        }),
      ),
    ).toBeNull();
  });
});
