import "server-only";
import {
  ADMIN_LIVE_TOPICS,
  type AdminLiveEvent,
  type AdminLiveTopic,
  type AdminLiveWorkspace,
} from "@/shared/model/admin-live";

/** Process-local demo transport. Production uses the database's native Realtime. */
export function createAdminEventBus() {
  const instance = crypto.randomUUID();
  let revision = 0;
  const history: AdminLiveEvent[] = [];
  const listeners = new Set<(event: AdminLiveEvent) => void>();
  return {
    publish(topics: readonly AdminLiveTopic[], workspace: AdminLiveWorkspace) {
      if (!topics.length) return;
      const event: AdminLiveEvent = {
        instance,
        revision: ++revision,
        workspace,
        topics: [...new Set(topics)],
      };
      history.push(event);
      if (history.length > 256) history.shift();
      for (const listener of [...listeners]) {
        // A disconnected response must never turn a completed write into an error.
        try {
          listener(event);
        } catch {
          listeners.delete(listener);
        }
      }
    },
    snapshot(
      workspace: AdminLiveWorkspace,
      lastEventId?: string | null,
    ): AdminLiveEvent {
      const snapshot: AdminLiveEvent = {
        instance,
        revision,
        workspace,
        topics: [],
      };
      if (!lastEventId) return snapshot;
      const separator = lastEventId.lastIndexOf(":");
      const previousInstance = lastEventId.slice(0, separator);
      const previousRevision = Number(lastEventId.slice(separator + 1));
      if (
        previousInstance !== instance ||
        !Number.isSafeInteger(previousRevision) ||
        previousRevision < 0 ||
        previousRevision > revision ||
        previousRevision < (history[0]?.revision ?? revision) - 1
      ) {
        return { ...snapshot, topics: [...ADMIN_LIVE_TOPICS] };
      }
      snapshot.topics = [
        ...new Set(
          history
            .filter(
              (event) =>
                event.revision > previousRevision &&
                (event.workspace === workspace ||
                  event.topics.includes("workspace")),
            )
            .flatMap((event) => event.topics),
        ),
      ];
      return snapshot;
    },
    subscribe(listener: (event: AdminLiveEvent) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type AdminEventBus = ReturnType<typeof createAdminEventBus>;
const globals = globalThis as typeof globalThis & {
  __biAdminEventBus?: AdminEventBus;
};
export const adminEventBus = () =>
  (globals.__biAdminEventBus ??= createAdminEventBus());
export const publishAdminEvent = (
  topics: readonly AdminLiveTopic[],
  workspace: AdminLiveWorkspace,
) => adminEventBus().publish(topics, workspace);
