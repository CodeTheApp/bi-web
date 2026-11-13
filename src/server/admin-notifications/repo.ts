import "server-only";
import type {
  AdminNotification,
  AdminNotificationFeed,
} from "@/entities/admin-notification";
import type { AdminRepo } from "@/server/admin/repo";
import { createSupabaseServer } from "@/shared/api/supabase/server";
import { getShopRepo } from "@/server/shop/repo";
import { demoWorkspaceKey, getDemoDataMode } from "@/server/demo-workspace";
import { readDemo, writeDemoSoon } from "@/server/demo-file";

const LIMIT = 200;
const memory = globalThis as typeof globalThis & {
  __biNotificationReads?: Map<string, Record<string, string[]>>;
};
export const notificationScope = (demo: boolean) =>
  demo ? demoWorkspaceKey("notifications", getDemoDataMode()) : "live";
const readFile = (scope: string) =>
  `demo-workspace-${scope.replace(":", "-")}-reads.json`;
function demoReads(scope: string) {
  const stores = (memory.__biNotificationReads ??= new Map());
  if (!stores.has(scope))
    stores.set(
      scope,
      readDemo<Record<string, string[]>>(readFile(scope)) ?? {},
    );
  return stores.get(scope)!;
}
const checked = <T>(result: { data: T; error: { message: string } | null }) => {
  if (result.error) throw new Error(result.error.message);
  return result.data;
};

type Source = Omit<AdminNotification, "read">;
export function customerNotification(customer: {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}): Source {
  const label = customer.name || customer.email;
  return {
    id: `customer:${customer.id}`,
    kind: "customer",
    title: "Novo cliente cadastrado",
    description: label.slice(0, 160),
    href: `/admin/loja/clientes?q=${encodeURIComponent(label)}`,
    createdAt: customer.createdAt,
  };
}
export function orderNotification(order: {
  id: string;
  number: number;
  name: string;
  createdAt: string;
}): Source {
  return {
    id: `order:${order.id}`,
    kind: "order",
    title: `Novo pedido #${order.number}`,
    description: order.name.slice(0, 160),
    href: `/admin/loja/pedidos/${encodeURIComponent(order.id)}`,
    createdAt: order.createdAt,
  };
}
export function messageNotification(message: {
  id: string;
  threadId: string;
  name: string;
  subject: string;
  createdAt: string;
}): Source {
  return {
    id: `message:${message.id}`,
    kind: "message",
    title: "Nova mensagem recebida",
    description: [message.name, message.subject]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 160),
    href: `/admin/mensagens?t=${encodeURIComponent(message.threadId)}`,
    createdAt: message.createdAt,
  };
}

export async function readNotificationFeed(
  repo: AdminRepo,
  userId: string,
  expectedScope: string,
): Promise<AdminNotificationFeed> {
  const observedAt = new Date().toISOString();
  const scope = notificationScope(repo.mode === "demo");
  if (scope !== expectedScope)
    throw new Error("O ambiente mudou. Atualize as notificações.");
  const cutoff = new Date(Date.now() - 120 * 86400000).toISOString();
  let sources: Source[];
  let readIds: string[];
  if (repo.mode === "demo") {
    const shop = await getShopRepo();
    const [customers, orders, summaries] = await Promise.all([
      shop.customers(),
      shop.allOrders(),
      repo.threads(),
    ]);
    const threads = await Promise.all(
      summaries.slice(0, LIMIT).map((thread) => repo.thread(thread.id)),
    );
    sources = [
      ...customers.map(customerNotification),
      ...orders.map(orderNotification),
      ...threads.flatMap((thread) =>
        thread
          ? thread.messages
              .filter((message) => message.direction === "in")
              .map((message) =>
                messageNotification({
                  id: message.id,
                  threadId: thread.id,
                  name: thread.name,
                  subject: thread.subject,
                  createdAt: message.at,
                }),
              )
          : [],
      ),
    ];
    readIds = demoReads(scope)[userId] ?? [];
  } else {
    const db = await createSupabaseServer();
    const [customers, orders, messages, markers] = await Promise.all([
      db
        .from("customers")
        .select("id,name,email,created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      db
        .from("orders")
        .select("id,number,name,created_at")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      db
        .from("messages")
        .select("id,thread_id,created_at")
        .eq("direction", "in")
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      db
        .from("admin_notification_reads")
        .select("notification_key")
        .eq("user_id", userId)
        .order("read_at", { ascending: false })
        .limit(2000),
    ]);
    const incoming = checked(messages) ?? [];
    const ids = [...new Set(incoming.map((message) => message.thread_id))];
    const threads = ids.length
      ? (checked(
          await db
            .from("threads")
            .select("id,contact_name,subject")
            .in("id", ids),
        ) ?? [])
      : [];
    const byThread = new Map(threads.map((thread) => [thread.id, thread]));
    sources = [
      ...(checked(customers) ?? []).map((customer) =>
        customerNotification({ ...customer, createdAt: customer.created_at }),
      ),
      ...(checked(orders) ?? []).map((order) =>
        orderNotification({ ...order, createdAt: order.created_at }),
      ),
      ...incoming.map((message) =>
        messageNotification({
          id: message.id,
          threadId: message.thread_id,
          name: byThread.get(message.thread_id)?.contact_name ?? "",
          subject: byThread.get(message.thread_id)?.subject ?? "",
          createdAt: message.created_at,
        }),
      ),
    ];
    readIds = (checked(markers) ?? []).map((marker) => marker.notification_key);
  }
  const read = new Set(readIds);
  if (scope !== notificationScope(repo.mode === "demo"))
    throw new Error("O ambiente mudou. Atualize as notificações.");
  const items = sources
    .filter((item) => Date.parse(item.createdAt) >= Date.parse(cutoff))
    .sort(
      (a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, LIMIT)
    .map((item) => ({ ...item, read: read.has(item.id) }));
  return { scope, observedAt, items };
}

export async function readNotifications(
  repo: AdminRepo,
  userId: string,
  scope: string,
  ids: string[],
) {
  const uniqueIds = [...new Set(ids)];
  if (scope !== notificationScope(repo.mode === "demo"))
    throw new Error("O ambiente mudou. Atualize as notificações.");
  if (repo.mode === "demo") {
    const rows = demoReads(scope);
    const previous = new Set(rows[userId] ?? []);
    if (!uniqueIds.some((id) => !previous.has(id))) return;
    rows[userId] = [...new Set([...(rows[userId] ?? []), ...uniqueIds])].slice(-2000);
    writeDemoSoon(readFile(scope), () => rows);
  } else if (uniqueIds.length) {
    const db = await createSupabaseServer();
    checked(
      await db.from("admin_notification_reads").upsert(
        uniqueIds.map((id) => ({
          user_id: userId,
          notification_key: id,
          read_at: new Date().toISOString(),
        })),
        { onConflict: "user_id,notification_key" },
      ),
    );
  }
}
