"use client";

import type { AdminNotification } from "@/entities/admin-notification";
import { notify } from "@/shared/lib/notify";
import type { SileoOptions } from "sileo";

type Context = { userId: string; scope: string };
// Sileo 0.1.6 accepts stable IDs at runtime but omits them from its published
// options type. Keep this compatibility addition local to the feature.
type IdentifiedToastOptions = Partial<SileoOptions> & { id: string };
const ACTION_LABELS = {
  customer: "Ver cliente",
  order: "Ver pedido",
  message: "Ler mensagem",
};

/** Sileo's default ID is shared; feed actions need a stable independent slot. */
export function showAdminNotification(
  item: AdminNotification,
  context: Context,
  open: () => void,
) {
  const options: IdentifiedToastOptions = {
    id: `admin-notification:${context.userId}:${context.scope}:${item.id}`,
    description: item.description,
    duration: 7000,
    autopilot: { expand: 0, collapse: 6200 },
    button: {
      title: ACTION_LABELS[item.kind],
      onClick: () => {
        notify.dismiss(id);
        open();
      },
    },
  };
  const id = notify.info(item.title, options);
  return id;
}

export function showNotificationOverflow(
  count: number,
  context: Context,
  open: () => void,
) {
  const options: IdentifiedToastOptions = {
    id: `admin-notification-summary:${context.userId}:${context.scope}`,
    button: { title: "Ver todas", onClick: open },
  };
  return notify.info(`Mais ${count} novidades`, options);
}
