"use client";
import { getThreads } from "@/shared/api/admin-reads";
import { Button, buttonVariants } from "@/shared/ui/button";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { AdminLiveUpdates } from "@/features/admin-live-updates/client";

import type { Me } from "@/entities/admin";
import type { BrandSettings } from "@/entities/site-content";
import type { AdminLiveWorkspace } from "@/shared/model/admin-live";
import { cn } from "@/shared/lib/utils";
import { DemoWorkspaceControl } from "@/features/demo-workspace";
import { AdminNotifications } from "@/features/admin-notifications";
import { Icon } from "@/shared/ui/admin/icons";
import { ControlTooltip, ToastProvider, unwrap } from "@/shared/ui/admin/ui";
import { AdminCommandSearch } from "./AdminCommandSearch";
import { AdminNavigation } from "./AdminNavigation";
import { currentAdminRoute } from "../model/navigation";
import { AdminAccountMenu } from "./AdminAccountMenu";
import { AdminLogo } from "./AdminLogo";
import { AdminQuickActions } from "./AdminQuickActions";
import {
  useAdminAppearance,
  useResolvedAdminTheme,
  setAdminCollapsed,
  setAdminTheme,
} from "@/features/admin-appearance";
import SwitchButton from "@/shared/ui/kokonutui/switch-button";
import { PanelLeftClose, PanelLeftOpen } from "@/shared/ui/icons/lucide";
import "./admin-shell.css";

export function AdminShell({
  me,
  demo,
  realtime,
  demoWorkspace,
  brand,
  brandName,
  children,
}: {
  me: Me;
  demo: boolean;
  realtime: boolean;
  demoWorkspace?: AdminLiveWorkspace;
  brand?: BrandSettings;
  brandName?: string;
  children: ReactNode;
}) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: true, retry: 1 },
        },
      }),
  );
  return (
    <QueryClientProvider client={qc}>
      <AdminLiveUpdates
        realtimeEnabled={realtime}
        userId={me.id}
        initialWorkspace={demoWorkspace}
      />
      <ToastProvider>
        <Shell me={me} demo={demo} brand={brand} brandName={brandName}>
          {children}
        </Shell>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function Shell({
  me,
  demo,
  brand,
  brandName = "Brasília Iluminação",
  children,
}: {
  me: Me;
  demo: boolean;
  brand?: BrandSettings;
  brandName?: string;
  children: ReactNode;
}) {
  const path = usePathname();
  const appearance = useAdminAppearance();
  const theme = useResolvedAdminTheme();
  const [flyout, setFlyout] = useState<"content" | "shop" | null>(null);
  const [open, setOpen] = useState(false);
  const sideRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const side = sideRef.current;
    const compact = window.matchMedia("(max-width: 900px)");
    const closeOnWideScreen = () => {
      if (!compact.matches) setOpen(false);
    };
    compact.addEventListener("change", closeOnWideScreen);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      [
        ...Array.from(
          side?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex="0"]',
          ) ?? [],
        ),
        ...Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-admin-nav-flyout] :is(a[href], button:not([disabled]), [role="menuitem"]):not([aria-disabled="true"])',
          ),
        ),
      ].filter(
        (item) => item.getClientRects().length > 0 && !item.closest("[inert]"),
      );
    focusable()[0]?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        if (document.querySelector("[data-admin-nav-flyout]")) {
          return;
        }
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items.at(-1);
        if (
          !side?.contains(document.activeElement) &&
          !document
            .querySelector("[data-admin-nav-flyout]")
            ?.contains(document.activeElement)
        ) {
          event.preventDefault();
          first?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    const toggle = menuButtonRef.current;
    return () => {
      window.removeEventListener("keydown", handleKey);
      compact.removeEventListener("change", closeOnWideScreen);
      document.body.style.overflow = previousOverflow;
      toggle?.focus({ preventScroll: true });
    };
  }, [open]);
  const threads = useQuery({
    queryKey: ["threads"],
    queryFn: ({ signal }) => unwrap(getThreads({ signal })),
  });
  const unread = threads.data?.filter((t) => t.status === "novo").length ?? 0;
  const current = currentAdminRoute(path);

  // fecha o menu lateral ao trocar de tela (no celular)
  const [lastPath, setLastPath] = useState(path);
  if (lastPath !== path) {
    setLastPath(path);
    setOpen(false);
    setFlyout(null);
  }

  return (
    <div className={`app${open ? " nav-open" : ""}`}>
      {open && (
        <button
          type="button"
          className="side-backdrop"
          aria-label="Fechar navegação"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sideRef}
        className="side"
        id="admin-navigation"
        aria-label="Navegação administrativa"
      >
        <Link
          className="admin-brand"
          href="/admin"
          aria-label={`${brandName} — painel`}
        >
          <AdminLogo
            className="admin-wordmark"
            brand={brand}
            name={brandName}
          />
          <AdminLogo
            className="admin-brandmark"
            compact
            brand={brand}
            name={brandName}
          />
        </Link>
        <AdminNavigation
          path={path}
          collapsed={appearance.collapsed}
          unread={unread}
          flyout={flyout}
          onFlyout={setFlyout}
        />
        <div className="admin-sidebar-footer">
          <ControlTooltip
            label={
              appearance.collapsed ? "Expandir navegação" : "Recolher navegação"
            }
          >
            <Button
              variant="ghost"
              className="admin-collapse-control"
              aria-label={
                appearance.collapsed
                  ? "Expandir navegação"
                  : "Recolher navegação"
              }
              aria-expanded={!appearance.collapsed}
              aria-controls="admin-navigation"
              onClick={() => setAdminCollapsed(!appearance.collapsed)}
            >
              {appearance.collapsed ? (
                <PanelLeftOpen size={16} />
              ) : (
                <PanelLeftClose size={16} />
              )}
              <span className="admin-nav-label">Recolher menu</span>
            </Button>
          </ControlTooltip>
          <span className="admin-sidebar-role">
            {me.role === "admin" ? "Administrador" : "Editor"}
          </span>
        </div>
      </aside>
      <div className="main">
        {/* Keep shared account animations relative to the sticky header during scroll restoration. */}
        <motion.header className="top" layoutRoot>
          <span className="admin-menu-control">
            <ControlTooltip label={open ? "Fechar menu" : "Abrir menu"}>
              <Button
                ref={menuButtonRef}
                variant="ghost"
                className="burger"
                aria-label={open ? "Fechar menu" : "Abrir menu"}
                aria-expanded={open}
                aria-controls="admin-navigation"
                onClick={() => setOpen((o) => !o)}
              >
                <Icon name="menu" />
              </Button>
            </ControlTooltip>
          </span>
          <AdminLogo className="tlg" brand={brand} name={brandName} />
          <div className="crumb">
            Painel / <b>{current.name}</b>
          </div>
          <AdminCommandSearch />
          <AdminNotifications userId={me.id} />
          <ControlTooltip
            label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
          >
            <SwitchButton
              className="admin-theme-switch"
              theme={theme}
              onThemeChange={setAdminTheme}
              size="sm"
              showLabel={false}
            />
          </ControlTooltip>
          <AdminAccountMenu me={me} />
          <a
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "ver-site",
            )}
            href="/"
            target="_blank"
            rel="noopener"
          >
            <Icon name="ext" />
            Ver site
          </a>
        </motion.header>
        {demo && (
          <div className="demo">
            <DemoWorkspaceControl />
          </div>
        )}
        <main className="view">{children}</main>
        <AdminQuickActions key={path} />
      </div>
    </div>
  );
}
