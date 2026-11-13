import type { AdminReadActions as Actions } from "@/server/admin/read-contract";
import type { Result } from "./result";

export type AdminReadOptions = { signal?: AbortSignal };
type Reader<K extends keyof Actions> = (
  ...args: [...Parameters<Actions[K]>, options?: AdminReadOptions]
) => ReturnType<Actions[K]>;

const envelope = (value: unknown): value is Result<unknown> =>
  Boolean(
    value &&
    typeof value === "object" &&
    "ok" in value &&
    ((value.ok === true && "data" in value) ||
      (value.ok === false &&
        "error" in value &&
        typeof value.error === "string")),
  );

async function transport(
  resource: keyof Actions,
  args: unknown[],
  options?: AdminReadOptions,
): Promise<Result<unknown>> {
  const search = new URLSearchParams({ args: JSON.stringify(args) });
  try {
    const response = await fetch(`/api/admin/read/${resource}?${search}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: options?.signal,
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return {
        ok: false,
        error: "Resposta inválida ao carregar os dados. Tente novamente.",
      };
    }
    if (envelope(body) && (response.ok || !body.ok)) return body;
    return {
      ok: false,
      error:
        response.status === 401
          ? "Sessão expirada. Entre de novo."
          : "Não foi possível carregar os dados. Tente novamente.",
    };
  } catch (error) {
    if (
      options?.signal?.aborted ||
      (error instanceof Error && error.name === "AbortError")
    )
      throw error;
    return {
      ok: false,
      error: "Não foi possível conectar ao painel. Tente novamente.",
    };
  }
}

function reader<K extends keyof Actions>(resource: K): Reader<K> {
  return ((...input: unknown[]) => {
    const tail = input.at(-1);
    const options =
      tail && typeof tail === "object" && !Array.isArray(tail)
        ? (input.pop() as AdminReadOptions)
        : undefined;
    // JSON turns undefined array slots into null. Preserve optional arguments
    // by omitting trailing undefined values before sending the tuple.
    while (input.length && input.at(-1) === undefined) input.pop();
    return transport(resource, input, options);
    // JSON is unknown at the wire boundary. The envelope is checked above; each
    // resource's payload/tuple contract is derived from its original action and
    // the authenticated server whitelist validates arguments before dispatch.
  }) as unknown as Reader<K>;
}

export const getDashboard = reader("getDashboard");
export const getSections = reader("getSections");
export const getProjects = reader("getProjects");
export const getProject = reader("getProject");
export const getMedia = reader("getMedia");
export const getMediaCategories = reader("getMediaCategories");
export const getList = reader("getList");
export const getThreads = reader("getThreads");
export const getThread = reader("getThread");
export const getSettings = reader("getSettings");
export const getProducts = reader("getProducts");
export const getProductAdmin = reader("getProductAdmin");
export const getProduct = reader("getProduct");
export const getStock = reader("getStock");
export const getStockMoves = reader("getStockMoves");
export const getOrders = reader("getOrders");
export const getOrderAdmin = reader("getOrderAdmin");
export const getCustomers = reader("getCustomers");
export const getCustomerAdmin = reader("getCustomerAdmin");
export const getCustomerOrdersAdmin = reader("getCustomerOrdersAdmin");
export const getCoupons = reader("getCoupons");
export const getShopAnalytics = reader("getShopAnalytics");
export const getSiteAnalytics = reader("getSiteAnalytics");
export const getDemoWorkspace = reader("getDemoWorkspace");
export const getAdminNotificationContext = reader(
  "getAdminNotificationContext",
);
export const getAdminNotifications = reader("getAdminNotifications");
