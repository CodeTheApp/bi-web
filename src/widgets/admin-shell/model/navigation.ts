import type { LucideIcon } from "@/shared/ui/icons/lucide";
import { navigationIcons as icons } from "@/shared/ui/icons/semantic";
export const ADMIN_ROUTES: Array<{
  href: string;
  name: string;
  icon: LucideIcon;
}> = [
  { href: "/admin", name: "Visão geral", icon: icons.home },
  { href: "/admin/analytics", name: "Analytics", icon: icons.analytics },
  { href: "/admin/paginas", name: "Páginas", icon: icons.pages },
  { href: "/admin/projetos", name: "Projetos", icon: icons.content },
  { href: "/admin/midia", name: "Mídia", icon: icons.media },
  {
    href: "/admin/depoimentos",
    name: "Depoimentos e FAQ",
    icon: icons.testimonials,
  },
  { href: "/admin/loja", name: "Produtos", icon: icons.products },
  { href: "/admin/loja/pedidos", name: "Pedidos", icon: icons.orders },
  { href: "/admin/loja/estoque", name: "Estoque", icon: icons.stock },
  { href: "/admin/loja/clientes", name: "Clientes", icon: icons.customers },
  { href: "/admin/loja/cupons", name: "Cupons", icon: icons.coupons },
  { href: "/admin/loja/financeiro", name: "Financeiro", icon: icons.finance },
  { href: "/admin/loja/relatorios", name: "Relatórios", icon: icons.reports },
  { href: "/admin/mensagens", name: "Mensagens", icon: icons.inbox },
  { href: "/admin/config", name: "Configurações", icon: icons.settings },
];
export const currentAdminRoute = (path: string) =>
  ADMIN_ROUTES.slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) =>
      route.href === "/admin"
        ? path === route.href
        : path === route.href || path.startsWith(`${route.href}/`),
    ) ?? ADMIN_ROUTES[0];
export const QUICK_DESTINATIONS = [
  "/admin/paginas",
  "/admin/midia",
  "/admin/loja",
  "/admin/loja/pedidos",
  "/admin/analytics",
  "/admin/loja/cupons",
  "/admin/mensagens",
  "/admin",
].map((href) => {
  const route = ADMIN_ROUTES.find((route) => route.href === href)!;
  return {
    id: route.href,
    label: route.name === "Visão geral" ? "Início" : route.name,
    icon: route.icon,
  };
});
