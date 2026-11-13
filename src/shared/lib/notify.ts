"use client";

import { sileo, type SileoOptions } from "sileo";
import { notificationMessage } from "./notification-message";

/** A single notification API for storefront and administration. */
export const notify = Object.assign(
  (title: string) => sileo.show({ ...notificationMessage(title), icon: null }),
  {
    success: (title: string, options?: Partial<SileoOptions>) => sileo.success({ ...notificationMessage(title, "Alteração concluída"), ...options }),
    error: (title: string, options?: Partial<SileoOptions>) => sileo.error({ ...notificationMessage(title, "Não foi possível concluir"), ...options, duration: 8000, autopilot: { expand: 0, collapse: 7200 } }),
    info: (title: string, options?: Partial<SileoOptions>) => sileo.info({ ...notificationMessage(title), ...options }),
    promise: sileo.promise,
    dismiss: sileo.dismiss,
  },
);
