"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackSiteEvent } from "@/shared/lib/site-events";

export function SiteAnalyticsTracker() {
  const path = usePathname();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === path) return;
    last.current = path;
    trackSiteEvent("page_view");
    if (/^\/loja\/[^/]+$/.test(path) && !/^\/loja\/(checkout|favoritos)$/.test(path)) trackSiteEvent("product_view");
  }, [path]);
  return null;
}
