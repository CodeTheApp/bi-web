import "server-only";
import { z } from "zod";
import type { Result } from "@/shared/api/result";
import { ctx, run } from "./guard";
import {
  getDashboard,
  getSections,
  getProjects,
  getProject,
  getMedia,
  getMediaCategories,
  getList,
  getThreads,
  getSettings,
} from "./actions";
import {
  getProducts,
  getProductAdmin,
  getStock,
  getStockMoves,
} from "@/server/catalog/actions";
import {
  getOrders,
  getOrderAdmin,
  getCustomers,
} from "@/server/shop/admin-actions";
import {
  getCustomerAdmin,
  getCustomerOrdersAdmin,
} from "@/server/shop/customer-actions";
import { getCoupons } from "@/entities/coupon/api/actions";
import { getShopAnalytics } from "@/entities/shop-analytics/api/actions";
import { getSiteAnalytics } from "@/server/analytics/actions";
import { getDemoWorkspace } from "@/features/demo-workspace/api/actions";
import {
  getAdminNotificationContext,
  getAdminNotifications,
} from "@/server/admin-notifications/actions";

const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);
const empty = z.tuple([]);
const oneId = z.tuple([id]);
type Definition = {
  schema: z.ZodType<unknown[]>;
  read: (args: unknown[]) => Promise<Result<unknown>>;
};
const define = <T extends unknown[]>(
  schema: z.ZodType<T>,
  read: (...args: T) => Promise<Result<unknown>>,
): Definition => ({ schema, read: (args) => read(...(args as T)) });

/** Closed whitelist: no method name from the request can reach a mutation. */
const reads = new Map<string, Definition>([
  ["getDashboard", define(empty, getDashboard)],
  ["getSections", define(empty, getSections)],
  ["getProjects", define(empty, getProjects)],
  ["getProject", define(oneId, getProject)],
  ["getMedia", define(empty, getMedia)],
  ["getMediaCategories", define(empty, getMediaCategories)],
  ["getList", define(z.tuple([z.enum(["testimonials", "faqs"])]), getList)],
  ["getThreads", define(empty, getThreads)],
  // The legacy getThread action also marks a thread as read. GET must stay
  // side-effect free; Inbox acknowledges it through markThreadRead instead.
  [
    "getThread",
    define(oneId, (threadId) =>
      run(async () => (await ctx()).repo.thread(threadId)),
    ),
  ],
  ["getSettings", define(empty, getSettings)],
  ["getProducts", define(empty, getProducts)],
  ["getProductAdmin", define(oneId, getProductAdmin)],
  ["getProduct", define(oneId, getProductAdmin)],
  ["getStock", define(empty, getStock)],
  ["getStockMoves", define(z.tuple([id.optional()]), getStockMoves)],
  ["getOrders", define(empty, getOrders)],
  ["getOrderAdmin", define(oneId, getOrderAdmin)],
  ["getCustomers", define(empty, getCustomers)],
  ["getCustomerAdmin", define(oneId, getCustomerAdmin)],
  ["getCustomerOrdersAdmin", define(oneId, getCustomerOrdersAdmin)],
  ["getCoupons", define(empty, getCoupons)],
  ["getShopAnalytics", define(empty, getShopAnalytics)],
  ["getSiteAnalytics", define(empty, getSiteAnalytics)],
  ["getDemoWorkspace", define(empty, getDemoWorkspace)],
  ["getAdminNotificationContext", define(empty, getAdminNotificationContext)],
  [
    "getAdminNotifications",
    define(z.tuple([z.string().min(1).max(60)]), getAdminNotifications),
  ],
]);

export async function readAdminResource(
  resource: string,
  args: unknown,
): Promise<{ status: number; result: Result<unknown> }> {
  // Authenticate even unknown/malformed requests before exposing the gateway.
  try {
    await ctx();
  } catch {
    return {
      status: 401,
      result: { ok: false, error: "Sessão expirada. Entre de novo." },
    };
  }
  const entry = reads.get(resource);
  if (!entry)
    return {
      status: 404,
      result: { ok: false, error: "Leitura administrativa não encontrada." },
    };
  const parsed = entry.schema.safeParse(args);
  if (!parsed.success)
    return {
      status: 400,
      result: { ok: false, error: "Parâmetros de leitura inválidos." },
    };
  try {
    return { status: 200, result: await entry.read(parsed.data) };
  } catch (error) {
    console.error("[admin/read] falha na leitura", error);
    return {
      status: 500,
      result: {
        ok: false,
        error: "Não foi possível carregar os dados. Tente novamente.",
      },
    };
  }
}
