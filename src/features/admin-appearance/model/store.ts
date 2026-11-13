"use client";

import { useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { z } from "zod";
import {
  createPersistedValue,
  syncPersistedValue,
} from "@/shared/lib/persisted-value";

export const adminAppearanceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  collapsed: z.boolean().default(false),
});
export type AdminTheme = z.infer<typeof adminAppearanceSchema>["theme"];
export const adminAppearance = createPersistedValue<
  z.infer<typeof adminAppearanceSchema>
>({
  key: "bi:admin-appearance",
  schema: adminAppearanceSchema,
  fallback: { theme: "system", collapsed: false },
});

export const resolveAdminTheme = (
  theme: AdminTheme,
  prefersDark: boolean,
): "light" | "dark" =>
  theme === "system" ? (prefersDark ? "dark" : "light") : theme;

function applyAppearance() {
  if (!document.querySelector(".adm-root")) return;
  const preference = adminAppearance.get();
  const resolved = resolveAdminTheme(
    preference.theme,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  document.documentElement.dataset.adminTheme = resolved;
  document.documentElement.dataset.adminSidebar = preference.collapsed
    ? "collapsed"
    : "expanded";
}

export function connectAdminAppearance() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const stopStore = adminAppearance.subscribe(applyAppearance);
  const stopStorage = syncPersistedValue(adminAppearance);
  media.addEventListener("change", applyAppearance);
  applyAppearance();
  return () => {
    stopStore();
    stopStorage();
    media.removeEventListener("change", applyAppearance);
    delete document.documentElement.dataset.adminTheme;
    delete document.documentElement.dataset.adminSidebar;
  };
}
export function setAdminTheme(theme: AdminTheme) {
  adminAppearance.set({ ...adminAppearance.get(), theme });
  applyAppearance();
}
export function setAdminCollapsed(collapsed: boolean) {
  adminAppearance.set({ ...adminAppearance.get(), collapsed });
  applyAppearance();
}
export const useAdminAppearance = () =>
  useStore(adminAppearance, (state) => state.value);

const resolvedSnapshot = () =>
  resolveAdminTheme(
    adminAppearance.get().theme,
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
const serverSnapshot = () => "light" as const;
const subscribeResolved = (notify: () => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const stop = adminAppearance.subscribe(notify);
  media.addEventListener("change", notify);
  return () => {
    stop();
    media.removeEventListener("change", notify);
  };
};
export const useResolvedAdminTheme = () =>
  useSyncExternalStore(subscribeResolved, resolvedSnapshot, serverSnapshot);
