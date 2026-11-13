"use client";

import { useId, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, type LucideIcon } from "@/shared/ui/icons/lucide";
import { navigationIcons } from "@/shared/ui/icons/semantic";
import { ADMIN_ROUTES, currentAdminRoute } from "../model/navigation";
import { ControlTooltip } from "@/shared/ui/admin/ui";
import { StackPanel, type StackPage } from "@/shared/ui/kokonutui/stack-panel";

type Group = "content" | "shop";
type NavigationProps = {
  path: string;
  collapsed: boolean;
  unread: number;
  flyout: Group | null;
  onFlyout: (value: Group | null) => void;
};
const CONTENT_ROUTES = [
  "/admin/paginas",
  "/admin/projetos",
  "/admin/midia",
  "/admin/depoimentos",
];
const SHOP_ROUTES = [
  "/admin/loja",
  "/admin/loja/pedidos",
  "/admin/loja/estoque",
  "/admin/loja/clientes",
  "/admin/loja/cupons",
];
const MANAGEMENT_ROUTES = [
  "/admin/loja/financeiro",
  "/admin/loja/relatorios",
  "/admin/analytics",
];

export function AdminNavigation({
  path,
  collapsed,
  unread,
  flyout,
  onFlyout,
}: NavigationProps) {
  const router = useRouter();
  const navigationId = useId();
  const triggerIds = {
    content: `${navigationId}-content`,
    shop: `${navigationId}-shop`,
  };
  const current = currentAdminRoute(path);
  const row = (href: string) => {
    const route = ADMIN_ROUTES.find((route) => route.href === href)!;
    return {
      id: href,
      label: route.name,
      current: current.href === href,
      icon: (
        <route.icon
          size={16}
          strokeWidth={1.7}
          className="admin-destination-icon"
          aria-hidden="true"
        />
      ),
      onSelect: () => {
        onFlyout(null);
        router.push(href);
      },
    };
  };
  const content: Record<string, StackPage> = {
    root: { title: "Conteúdo", sections: [{ rows: CONTENT_ROUTES.map(row) }] },
  };
  const shop: Record<string, StackPage> = {
    root: {
      title: "Loja",
      sections: [
        { rows: SHOP_ROUTES.map(row) },
        {
          rows: [
            {
              id: "management",
              label: "Financeiro e relatórios",
              to: "management",
              icon: (
                <navigationIcons.finance
                  size={16}
                  strokeWidth={1.7}
                  className="admin-destination-icon"
                  aria-hidden="true"
                />
              ),
            },
          ],
        },
      ],
    },
    management: {
      title: "Gestão da loja",
      sections: [{ rows: MANAGEMENT_ROUTES.map(row) }],
    },
  };
  return (
    <Popover.Root<Group>
      open={flyout !== null}
      triggerId={flyout ? triggerIds[flyout] : null}
      onOpenChange={(open, details) =>
        onFlyout(
          open
            ? details.trigger?.id === triggerIds.shop
              ? "shop"
              : "content"
            : null,
        )
      }
    >
      {({ payload }) => (
        <>
          <nav className="admin-navigation" aria-label="Páginas do painel">
            <span className="admin-nav-caption">Painel</span>
            <NavLink
              href="/admin"
              icon={navigationIcons.home}
              current={current.href}
              collapsed={collapsed}
            >
              Visão geral
            </NavLink>
            <NavLink
              href="/admin/analytics"
              icon={navigationIcons.analytics}
              current={current.href}
              collapsed={collapsed}
            >
              Analytics
            </NavLink>
            <span className="admin-nav-caption">Gerenciar</span>
            <NavFlyout
              id={triggerIds.content}
              group="content"
              label="Conteúdo"
              icon={navigationIcons.content}
              active={CONTENT_ROUTES.some((href) => current.href === href)}
            />
            <NavFlyout
              id={triggerIds.shop}
              group="shop"
              label="Loja"
              icon={navigationIcons.products}
              active={current.href.startsWith("/admin/loja")}
            />
            <NavLink
              href="/admin/mensagens"
              icon={navigationIcons.inbox}
              current={current.href}
              collapsed={collapsed}
              badge={unread}
            >
              Mensagens
            </NavLink>
            <NavLink
              href="/admin/config"
              icon={navigationIcons.settings}
              current={current.href}
              collapsed={collapsed}
            >
              Configurações
            </NavLink>
          </nav>
          <Popover.Portal>
            <Popover.Positioner
              side="right"
              align="start"
              sideOffset={16}
              collisionPadding={12}
              className="admin-nav-positioner"
            >
              <Popover.Popup
                className="adm admin-nav-flyout"
                data-admin-nav-flyout=""
                aria-label={payload === "shop" ? "Loja" : "Conteúdo"}
              >
                <StackPanel
                  key={payload}
                  pages={payload === "shop" ? shop : content}
                  root="root"
                  stableHeight
                  className="admin-nav-stack"
                />
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </>
      )}
    </Popover.Root>
  );
}

function NavLink({
  href,
  icon,
  current,
  collapsed,
  badge,
  children,
}: {
  href: string;
  icon: LucideIcon;
  current: string;
  collapsed: boolean;
  badge?: number;
  children: ReactNode;
}) {
  const DestinationIcon = icon;
  const link = (
    <Link
      href={href}
      aria-current={href === current ? "page" : undefined}
      aria-label={typeof children === "string" ? children : undefined}
      className={`admin-nav-link${href === current ? " on" : ""}`}
    >
      <DestinationIcon
        size={16}
        strokeWidth={1.7}
        className="admin-destination-icon"
        aria-hidden="true"
      />
      <span className="admin-nav-label">{children}</span>
      {Boolean(badge) && <span className="admin-nav-count">{badge}</span>}
    </Link>
  );
  return collapsed ? (
    <ControlTooltip
      label={typeof children === "string" ? children : "Abrir página"}
    >
      {link}
    </ControlTooltip>
  ) : (
    link
  );
}

function NavFlyout({
  id,
  group,
  label,
  icon,
  active,
}: {
  id: string;
  group: Group;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  const DestinationIcon = icon;
  return (
    <Popover.Trigger
      id={id}
      payload={group}
      openOnHover
      className={`admin-nav-link admin-nav-group-button${active ? " on" : ""}`}
      aria-label={label}
    >
      <DestinationIcon
        size={16}
        strokeWidth={1.7}
        className="admin-destination-icon"
        aria-hidden="true"
      />
      <span className="admin-nav-label">{label}</span>
      <ChevronRight className="admin-nav-chevron" size={13} />
    </Popover.Trigger>
  );
}
