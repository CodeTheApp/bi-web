import {
  ADMIN_LIVE_TOPICS,
  type AdminLiveTopic,
} from "@/shared/model/admin-live";

const KEYS: Record<AdminLiveTopic, readonly string[]> = {
  threads: ["threads", "thread", "dashboard"],
  notifications: ["admin-notifications"],
  sections: ["sections", "dashboard", "media"],
  lists: ["list"],
  projects: ["projects", "project", "dashboard", "media"],
  media: ["media", "media-categories", "dashboard"],
  settings: ["settings"],
  users: ["settings", "media"],
  products: ["products", "product", "stock", "dashboard", "shop-analytics"],
  stock: [
    "stock",
    "stockMoves",
    "stock-moves",
    "products",
    "product",
    "shop-analytics",
  ],
  orders: [
    "orders",
    "order",
    "customers",
    "customer",
    "customer-orders",
    "stock",
    "stockMoves",
    "products",
    "product",
    "shop-analytics",
    "admin-notifications",
  ],
  customers: [
    "customers",
    "customer",
    "customer-orders",
    "shop-analytics",
    "admin-notifications",
  ],
  coupons: ["coupons", "shop-analytics"],
  "site-analytics": ["site-analytics"],
  activity: ["dashboard"],
  workspace: ["demo-workspace", "admin-notification-context"],
};

export const queryRootsForTopics = (topics: readonly AdminLiveTopic[]) => [
  ...new Set(topics.flatMap((topic) => KEYS[topic])),
];
export const ALL_ADMIN_QUERY_ROOTS = queryRootsForTopics(ADMIN_LIVE_TOPICS);

/** One invalidation per burst; inactive queries become stale without refetching. */
export function createLiveInvalidator(
  onFlush: (roots: readonly string[]) => void,
  delay = 100,
) {
  const pending = new Set<AdminLiveTopic>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  return {
    push(topics: readonly AdminLiveTopic[]) {
      if (stopped) return;
      for (const topic of topics) pending.add(topic);
      if (!pending.size || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        const roots = queryRootsForTopics([...pending]);
        pending.clear();
        if (!stopped && roots.length) onFlush(roots);
      }, delay);
    },
    dispose() {
      stopped = true;
      if (timer) clearTimeout(timer);
      pending.clear();
    },
  };
}

/** Multiple table listeners share one native Supabase channel. Existing RLS stays authoritative. */
export const TABLE_TOPICS: Record<string, readonly AdminLiveTopic[]> = {
  threads: ["threads"],
  messages: ["threads", "notifications"],
  admin_notification_reads: ["notifications"],
  sections: ["sections"],
  testimonials: ["lists"],
  faqs: ["lists"],
  projects: ["projects"],
  project_images: ["projects"],
  media: ["media"],
  media_categories: ["media"],
  settings: ["settings"],
  profiles: ["users"],
  products: ["products"],
  product_variants: ["products", "stock"],
  product_media: ["products", "media"],
  stock_movements: ["stock"],
  orders: ["orders"],
  customers: ["customers"],
  customer_addresses: ["customers"],
  coupons: ["coupons"],
  coupon_redemptions: ["coupons", "orders"],
  site_events: ["site-analytics"],
  audit_log: ["activity"],
};
