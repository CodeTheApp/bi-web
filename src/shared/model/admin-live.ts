/** Invalidation hints only: no customer, message or staff data crosses the stream. */
export const ADMIN_LIVE_TOPICS = [
  "threads",
  "notifications",
  "sections",
  "lists",
  "projects",
  "media",
  "settings",
  "users",
  "products",
  "stock",
  "orders",
  "customers",
  "coupons",
  "site-analytics",
  "activity",
  "workspace",
] as const;
export type AdminLiveTopic = (typeof ADMIN_LIVE_TOPICS)[number];
export type AdminLiveWorkspace = "examples" | "empty";
export type AdminLiveEvent = {
  instance: string;
  revision: number;
  workspace: AdminLiveWorkspace;
  topics: AdminLiveTopic[];
};
