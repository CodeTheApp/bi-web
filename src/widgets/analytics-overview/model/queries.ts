"use client";
import { useQuery } from "@tanstack/react-query";
import { getShopAnalytics, getSiteAnalytics } from "@/shared/api/admin-reads";
import { unwrap } from "@/shared/api/result";

export const shopAnalyticsKey = ["shop-analytics"] as const;
export const siteAnalyticsKey = ["site-analytics"] as const;
export const useShopAnalyticsData = () =>
  useQuery({
    queryKey: shopAnalyticsKey,
    queryFn: ({ signal }) => unwrap(getShopAnalytics({ signal })),
    staleTime: 60_000,
  });
export const useSiteAnalyticsData = () =>
  useQuery({
    queryKey: siteAnalyticsKey,
    queryFn: ({ signal }) => unwrap(getSiteAnalytics({ signal })),
    staleTime: 60_000,
  });
