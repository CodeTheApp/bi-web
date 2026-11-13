import { createElement as h, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/shared/api/admin-reads", () => ({
  getShopAnalytics: vi.fn(),
  getSiteAnalytics: vi.fn(),
  getDashboard: vi.fn(),
  getThreads: vi.fn(),
}));
vi.mock("nuqs", async (original) => ({
  ...(await original<typeof import("nuqs")>()),
  useQueryState: () => ["30d", vi.fn()],
}));
vi.mock("@/shared/ui/kokonutui/metric-card", () => ({
  default: ({ label }: { label: string }) =>
    h("article", { "data-chart": label }, label),
}));
vi.mock("@/shared/ui/admin/DataTable", () => ({
  AdminDataTable: ({ empty }: { empty: string }) => h("p", null, empty),
}));
vi.mock("@/_pages/admin-projects/ui/Projects", () => ({
  NewProjectButton: () => h("button", null, "Novo projeto"),
}));
import { AnalyticsOverview } from "@/widgets/analytics-overview";
import SpendingRing from "@/shared/ui/kokonutui/spending-ring";
import { Dashboard } from "@/_pages/admin-dashboard/ui/Dashboard";
import type { AnalyticsOrder } from "@/entities/shop-analytics/model";

const order: AnalyticsOrder = {
  id: "order",
  number: 1001,
  customerName: "Teste",
  createdAt: new Date().toISOString(),
  status: "pago",
  subtotalCents: 10000,
  shippingCents: 0,
  totalCents: 10000,
  method: "pix",
  paymentStatus: "aprovado",
  paidAt: new Date().toISOString(),
  refundedAt: null,
  wasPaid: true,
  items: [
    {
      productId: "product",
      title: "Pendente",
      category: "pendentes",
      sku: "P-1",
      qty: 1,
      priceCents: 10000,
    },
  ],
};
const client = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: Infinity },
    },
  });
const render = (
  queryClient: QueryClient,
  component: ReactNode = h(AnalyticsOverview),
) =>
  renderToStaticMarkup(
    h(QueryClientProvider, { client: queryClient }, component),
  );

describe("independent dashboard loading", () => {
  it("renders payments and categories while the traffic request is still pending", () => {
    const queryClient = client();
    queryClient.setQueryData(["shop-analytics"], {
      orders: [order],
      generatedAt: new Date().toISOString(),
    });
    const html = render(queryClient);
    expect(html).toContain('data-chart="Pagamentos aprovados"');
    expect(html).toContain("Produtos por categoria");
    expect(html).toContain("Carregando visualizações");
    expect(html).toContain("Carregando páginas mais vistas");
    expect(html).not.toContain('data-chart="Visualizações do site"');
  });

  it("renders traffic and page data without waiting for the shop request", () => {
    const queryClient = client();
    queryClient.setQueryData(["site-analytics"], {
      events: [],
      startedAt: null,
      truncated: false,
      dataMode: "live",
      syntheticEvents: 0,
    });
    const html = render(queryClient);
    expect(html).toContain('data-chart="Visualizações do site"');
    expect(html).toContain(
      "As páginas aparecem aqui conforme o site recebe visitas.",
    );
    expect(html).toContain("Carregando pagamentos");
    expect(html).toContain("Carregando vendas por categoria");
  });

  it("keeps ready data visible during a background refresh error", () => {
    const queryClient = client();
    queryClient.setQueryData(["shop-analytics"], {
      orders: [order],
      generatedAt: new Date().toISOString(),
    });
    queryClient
      .getQueryCache()
      .find({ queryKey: ["shop-analytics"] })!
      .setState({
        status: "error",
        error: new Error("Atualização indisponível"),
      });
    const html = render(queryClient);
    expect(html).toContain('data-chart="Pagamentos aprovados"');
    expect(html).not.toContain("Carregando pagamentos");
  });

  it("shows shortcuts and independently loaded messages while dashboard totals are pending", () => {
    const queryClient = client();
    queryClient.setQueryData(
      ["threads"],
      [
        {
          id: "thread",
          name: "Contato pronto",
          subject: "Mensagem disponível",
          interest: "Projeto",
          status: "novo",
          lastAt: new Date().toISOString(),
        },
      ],
    );
    const html = render(queryClient, h(Dashboard, { name: "Camila" }));
    expect(html).toContain("Editar textos");
    expect(html).toContain("Contato pronto");
    expect(html).toContain("Carregando projetos");
    expect(html).toContain("Carregando atividade recente");
  });
});

describe("category chart labels", () => {
  const categories = [
    {
      name: "Pendentes",
      amount: 200,
      stroke: "stroke-amber-600",
      dot: "bg-amber-600",
    },
  ];
  it("uses Portuguese labels and theme tokens, without inventing a monthly comparison", () => {
    const html = renderToStaticMarkup(
      h(SpendingRing, { categories, currency: "BRL" }),
    );
    expect(html).toContain("100% do total");
    expect(html).toContain("bg-card");
    expect(html).not.toMatch(
      /of total|Same as last month|Sem variação no mês|dark:bg-zinc-950/,
    );
  });
  it("shows a monthly comparison only when it is explicitly provided", () => {
    expect(
      renderToStaticMarkup(
        h(SpendingRing, {
          categories: [{ ...categories[0], change: 0 }],
          currency: "BRL",
        }),
      ),
    ).toContain("Sem variação no mês");
  });
});
