import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { Order } from "@/entities/order";
vi.mock("@/server/shop/admin-actions", () => ({
  addOrderNote: vi.fn(),
  getOrderAdmin: vi.fn(),
  setOrderStatus: vi.fn(),
}));
vi.mock("@/features/manage-customers/api/actions", () => ({
  getCustomerAdmin: vi.fn(),
  getCustomerOrdersAdmin: vi.fn(),
  updateCustomerContact: vi.fn(),
}));
// Radix portals do not render in SSR. Expose the drawer contents for this query-state regression.
vi.mock("@/shared/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? h("div", null, children) : null,
  DialogContent: ({ children }: { children: ReactNode }) =>
    h("div", { role: "dialog" }, children),
  DialogHeader: ({ children }: { children: ReactNode }) =>
    h("header", null, children),
  DialogTitle: ({ children }: { children: ReactNode }) =>
    h("h2", null, children),
  DialogDescription: ({ children }: { children: ReactNode }) =>
    h("p", null, children),
}));
vi.mock("@/features/manage-customers/ui/CustomerOrders", () => ({
  CustomerOrders: () => h("p", null, "Histórico preservado"),
}));
import { OrderAdmin } from "@/features/manage-orders/ui/OrderDetail";
import { CustomerDrawer } from "@/features/manage-customers/ui/CustomerDrawer";
import { ToastProvider } from "@/shared/ui/admin/ui";
const order: Order = {
  id: "cached",
  number: 9876,
  customerId: "customer",
  email: "comprador@example.com",
  name: "Comprador em cache",
  phone: "",
  items: [],
  subtotalCents: 10000,
  shippingCents: 0,
  totalCents: 10000,
  shipping: {
    id: "retirada",
    label: "Retirada",
    days: "Combinar",
    priceCents: 0,
    address: null,
  },
  payment: null,
  status: "entregue",
  tracking: "",
  notes: "",
  timeline: [],
  createdAt: "2026-11-12T12:00:00Z",
};
const client = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  });
const render = (queryClient: QueryClient, component: ReactNode) =>
  renderToStaticMarkup(
    h(
      QueryClientProvider,
      { client: queryClient },
      h(ToastProvider, { children: component }),
    ),
  );
function markRefreshError(
  queryClient: QueryClient,
  key: string[],
  data: unknown,
) {
  queryClient.setQueryData(key, data);
  queryClient
    .getQueryCache()
    .find({ queryKey: key })!
    .setState({
      status: "error",
      error: new Error("Atualização indisponível"),
    });
}

describe("detail views preserve cached data on refresh failure", () => {
  it("keeps an already loaded order visible when its background refetch fails", () => {
    const queryClient = client();
    markRefreshError(queryClient, ["order", order.id], order);
    const html = render(queryClient, h(OrderAdmin, { id: order.id }));
    expect(html).toContain("Pedido nº 9876");
    expect(html).toContain("Comprador em cache");
    expect(html).not.toContain("Carregando pedido");
    expect(html).not.toContain("Pedido não encontrado");
  });
  it("keeps the customer's contact, metrics and history when either cached request fails", () => {
    const queryClient = client();
    markRefreshError(queryClient, ["customer", "customer"], {
      id: "customer",
      name: "Contato em cache",
      email: "login@example.com",
      contactEmail: "atendimento@example.com",
      phone: "",
      provider: "email",
      createdAt: "2026-11-12T12:00:00Z",
    });
    markRefreshError(queryClient, ["customer-orders", "customer"], []);
    const html = render(
      queryClient,
      h(CustomerDrawer, {
        id: "customer",
        onClose: vi.fn(),
        returnFocus: vi.fn(),
      }),
    );
    expect(html).toContain('value="Contato em cache"');
    expect(html).toContain('value="atendimento@example.com"');
    expect(html).toContain("Total comprado");
    expect(html).toContain("Histórico preservado");
    expect(html).not.toContain("Carregando cadastro do cliente");
    expect(html).not.toContain("Carregando resumo de compras");
  });
  it("still shows an initial fetch error rather than inventing an order", () => {
    const queryClient = client();
    markRefreshError(queryClient, ["order", order.id], null);
    const html = render(queryClient, h(OrderAdmin, { id: order.id }));
    expect(html).toContain("Atualização indisponível");
    expect(html).not.toContain("Comprador em cache");
  });
});
