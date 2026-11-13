import {
  ADMIN_LIVE_TOPICS,
  type AdminLiveEvent,
  type AdminLiveWorkspace,
} from "@/shared/model/admin-live";

export function parseLiveEvent(raw: string): AdminLiveEvent | null {
  try {
    const event = JSON.parse(raw) as AdminLiveEvent;
    return typeof event.instance === "string" &&
      event.instance.length < 100 &&
      Number.isSafeInteger(event.revision) &&
      event.revision >= 0 &&
      (event.workspace === "examples" || event.workspace === "empty") &&
      Array.isArray(event.topics) &&
      event.topics.every((topic) => ADMIN_LIVE_TOPICS.includes(topic))
      ? event
      : null;
  } catch {
    return null;
  }
}

type EventSourceLike = Pick<
  EventTarget,
  "addEventListener" | "removeEventListener"
> & { close(): void };

/** EventSource owns reconnection/Last-Event-ID. A ready event carries missed topics from the journal. */
export function connectDemoEvents(
  source: EventSourceLike,
  onTopics: (event: AdminLiveEvent) => void,
  onWorkspaceChanged: () => void,
  initialWorkspace?: AdminLiveWorkspace,
) {
  let workspace = initialWorkspace;
  let cursor = "";
  let closed = false;
  const receive = (message: Event) => {
    if (closed) return;
    const event = parseLiveEvent((message as MessageEvent<string>).data);
    if (!event) return;
    if (workspace && event.workspace !== workspace) {
      close();
      onWorkspaceChanged();
      return;
    }
    workspace = event.workspace;
    const nextCursor = `${event.instance}:${event.revision}`;
    if (nextCursor === cursor) return;
    cursor = nextCursor;
    onTopics(event);
  };
  const close = () => {
    if (closed) return;
    closed = true;
    source.removeEventListener("ready", receive);
    source.removeEventListener("change", receive);
    source.close();
  };
  source.addEventListener("ready", receive);
  source.addEventListener("change", receive);
  return close;
}
