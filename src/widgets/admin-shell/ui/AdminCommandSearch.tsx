"use client";
import { useRouter } from "next/navigation";
import ActionSearchBar, {
  type CommandItem,
} from "@/shared/ui/kokonutui/action-search-bar";

const items: CommandItem[] = [
  { id: "home", label: "Visão geral", href: "/admin", group: "Painel" },
  {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
    group: "Painel",
    keywords: ["gráficos", "métricas", "visitas"],
  },
  {
    id: "pages",
    label: "Páginas",
    href: "/admin/paginas",
    group: "Conteúdo",
    keywords: ["seções", "home", "publicar"],
  },
  {
    id: "projects",
    label: "Projetos",
    href: "/admin/projetos",
    group: "Conteúdo",
  },
  {
    id: "media",
    label: "Mídia",
    href: "/admin/midia",
    group: "Conteúdo",
    keywords: ["fotos", "categorias", "galeria"],
  },
  {
    id: "testimonials",
    label: "Depoimentos e FAQ",
    href: "/admin/depoimentos",
    group: "Conteúdo",
  },
  {
    id: "shop",
    label: "Loja",
    group: "Gestão",
    children: [
      { id: "products", label: "Produtos", href: "/admin/loja" },
      { id: "orders", label: "Pedidos", href: "/admin/loja/pedidos" },
      { id: "stock", label: "Estoque", href: "/admin/loja/estoque" },
      { id: "customers", label: "Clientes", href: "/admin/loja/clientes" },
      {
        id: "coupons",
        label: "Cupons",
        href: "/admin/loja/cupons",
        keywords: ["desconto", "promoção"],
      },
      {
        id: "finance",
        label: "Financeiro",
        href: "/admin/loja/financeiro",
        keywords: ["pagamentos", "estornos", "receita"],
      },
      {
        id: "reports",
        label: "Relatórios",
        href: "/admin/loja/relatorios",
        keywords: ["reports", "vendas", "csv"],
      },
    ],
  },
  {
    id: "inbox",
    label: "Mensagens",
    href: "/admin/mensagens",
    group: "Atendimento",
  },
  {
    id: "settings",
    label: "Configurações",
    href: "/admin/config",
    group: "Conta",
  },
];

export function AdminCommandSearch() {
  const router = useRouter();
  return (
    <ActionSearchBar
      className="admin-command-search"
      shortcut
      items={items}
      defaultRecent={[]}
      label="Buscar no painel"
      placeholder="Buscar no painel…"
      onSelect={(item) => {
        if (item.href) router.push(item.href);
      }}
    />
  );
}
