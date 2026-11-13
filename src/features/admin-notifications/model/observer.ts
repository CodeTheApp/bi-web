import { createStore } from "zustand/vanilla";
import type { AdminNotificationFeed } from "@/entities/admin-notification";

type Partition = { baseline: string; seen: string[] };
type Observer = {
  partitions: Record<string, Partition>;
  observe: (
    key: string,
    feed: AdminNotificationFeed,
  ) => AdminNotificationFeed["items"];
};

/** IDs and a timestamp only. No customer details or message content in storage. */
export function createNotificationObserver() {
  return createStore<Observer>((set, get) => ({
    partitions: {},
    observe(key, feed) {
      const previous = get().partitions[key];
      const seen = new Set(previous?.seen ?? []);
      const fresh = previous
        ? feed.items.filter(
            (item) =>
              !seen.has(item.id) &&
              !item.read &&
              Date.parse(item.createdAt) >= Date.parse(previous.baseline),
          )
        : [];
      for (const item of feed.items) seen.add(item.id);
      set({
        partitions: {
          ...get().partitions,
          [key]: {
            baseline: previous?.baseline ?? feed.observedAt,
            seen: [...seen].slice(-2000),
          },
        },
      });
      return fresh;
    },
  }));
}
export const notificationObserver = createNotificationObserver();
