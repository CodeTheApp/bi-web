// Compile-time contract only: importing this type never loads Server Actions
// into the browser or introduces a shared → feature/entity dependency.
import type * as Admin from "@/server/admin/actions";
import type * as Catalog from "@/server/catalog/actions";
import type * as Shop from "@/server/shop/admin-actions";
import type * as Customers from "@/server/shop/customer-actions";
import type * as Coupons from "@/entities/coupon/api/actions";
import type * as ShopAnalytics from "@/entities/shop-analytics/api/actions";
import type * as SiteAnalytics from "@/server/analytics/actions";
import type * as Demo from "@/features/demo-workspace/api/actions";
import type * as Notifications from "@/server/admin-notifications/actions";

export type AdminReadActions = Pick<
  typeof Admin,
  | "getDashboard"
  | "getSections"
  | "getProjects"
  | "getProject"
  | "getMedia"
  | "getMediaCategories"
  | "getList"
  | "getThreads"
  | "getThread"
  | "getSettings"
> &
  Pick<
    typeof Catalog,
    "getProducts" | "getProductAdmin" | "getStock" | "getStockMoves"
  > &
  Pick<typeof Shop, "getOrders" | "getOrderAdmin" | "getCustomers"> &
  Pick<typeof Customers, "getCustomerAdmin" | "getCustomerOrdersAdmin"> &
  Pick<typeof Coupons, "getCoupons"> &
  Pick<typeof ShopAnalytics, "getShopAnalytics"> &
  Pick<typeof SiteAnalytics, "getSiteAnalytics"> &
  Pick<typeof Demo, "getDemoWorkspace"> &
  Pick<
    typeof Notifications,
    "getAdminNotificationContext" | "getAdminNotifications"
  > & { getProduct: typeof Catalog.getProductAdmin };
