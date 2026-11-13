"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "sileo";
import "sileo/styles.css";
import "@/shared/ui/notifications.css";

const themeSnapshot = () => document.documentElement.dataset.adminTheme === "dark" ? "dark" as const : "light" as const;
const serverThemeSnapshot = () => "light" as const;
const subscribeTheme = (changed: () => void) => {
  const observer = new MutationObserver(changed);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-admin-theme"] });
  return () => observer.disconnect();
};
export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, themeSnapshot, serverThemeSnapshot);
  return (
    <NuqsAdapter>
      {children}
      <Toaster position="bottom-center" theme={theme} options={{ duration: 4000, roundness: 18, fill: theme === "dark" ? "#25262bee" : "#fcfcfcef", styles: { title: "notification-title", description: "notification-description" } }} />
    </NuqsAdapter>
  );
}
