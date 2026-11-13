import "server-only";
import type {
  AdminLiveEvent,
  AdminLiveWorkspace,
} from "@/shared/model/admin-live";
import { ADMIN_LIVE_TOPICS } from "@/shared/model/admin-live";
import { adminEventBus, type AdminEventBus } from "./event-bus";

/** One heartbeat timer per connection; it performs no repository or database reads. */
export function createAdminEventStream(
  signal: AbortSignal,
  workspace: AdminLiveWorkspace,
  lastEventId?: string | null,
  bus: AdminEventBus = adminEventBus(),
) {
  let cleanup = () => {};
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let currentWorkspace = workspace;
      const encoder = new TextEncoder();
      let unsubscribe = () => {};
      cleanup = () => {
        closed = true;
        unsubscribe();
        if (heartbeat) clearInterval(heartbeat);
        signal.removeEventListener("abort", close);
      };
      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.close();
      };
      const send = (name: "ready" | "change", event: AdminLiveEvent) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(
            `id: ${event.instance}:${event.revision}\nevent: ${name}\ndata: ${JSON.stringify(event)}\n\n`,
          ),
        );
      };
      unsubscribe = bus.subscribe((event) => {
        if (event.topics.includes("workspace")) {
          currentWorkspace = event.workspace;
          send("change", { ...event, topics: [...ADMIN_LIVE_TOPICS] });
        } else if (event.workspace === currentWorkspace) send("change", event);
      });
      send("ready", bus.snapshot(currentWorkspace, lastEventId));
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 25_000);
      signal.addEventListener("abort", close, { once: true });
      if (signal.aborted) close();
    },
    cancel() {
      cleanup();
    },
  });
}
