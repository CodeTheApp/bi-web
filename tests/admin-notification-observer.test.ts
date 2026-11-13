import { describe, expect, it } from "vitest";
import type {
  AdminNotification,
  AdminNotificationFeed,
} from "@/entities/admin-notification";
import { createNotificationObserver } from "@/features/admin-notifications/model/observer";
const initial = "2026-11-12T15:00:00Z";
const item = (
  id: string,
  createdAt = "2026-11-12T14:00:00Z",
  read = false,
): AdminNotification => ({
  id,
  createdAt,
  read,
  kind: "order",
  title: "Pedido",
  description: "Cliente",
  href: "/admin/loja/pedidos/id",
});
const feed = (...items: AdminNotification[]): AdminNotificationFeed => ({
  scope: "demo:examples",
  observedAt: initial,
  items,
});
describe("notification event deduplication", () => {
  it("silences initial history then announces each genuinely new record once", () => {
    const observe = createNotificationObserver().getState().observe;
    expect(observe("user:examples", feed(item("old")))).toEqual([]);
    const incoming = item("new", "2026-11-12T15:00:01+00:00");
    expect(observe("user:examples", feed(incoming, item("old")))).toEqual([
      incoming,
    ]);
    expect(observe("user:examples", feed(incoming, item("old")))).toEqual([]);
  });
  it("never announces history backfills or an entry already read on another device", () => {
    const observe = createNotificationObserver().getState().observe;
    observe("user:examples", feed());
    expect(
      observe(
        "user:examples",
        feed(item("backfill"), item("read", "2026-11-12T15:01:00Z", true)),
      ),
    ).toEqual([]);
  });
  it("partitions initial baselines and IDs by staff member and workspace", () => {
    const observe = createNotificationObserver().getState().observe;
    observe("user:examples", feed());
    const newer = item("new", "2026-11-12T15:00:01Z");
    expect(observe("other:examples", feed(newer))).toEqual([]);
    expect(observe("user:empty", feed(newer))).toEqual([]);
    expect(observe("user:examples", feed(newer))).toEqual([newer]);
  });
});
