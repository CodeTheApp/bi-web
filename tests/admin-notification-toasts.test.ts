import { afterEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { sileo, Toaster } from "sileo";
import type { AdminNotification } from "@/entities/admin-notification";
import { notify } from "@/shared/lib/notify";
import {
  showAdminNotification,
  showNotificationOverflow,
} from "@/features/admin-notifications/model/toasts";

const item = (
  id: string,
  title: string,
  kind: AdminNotification["kind"] = "customer",
): AdminNotification => ({
  id,
  title,
  kind,
  description: "Cliente de teste",
  createdAt: "2026-11-12T15:00:00Z",
  href: "/admin/loja/clientes",
  read: false,
});
const context = { userId: "staff-a", scope: "notifications:examples" };
const markup = () =>
  renderToStaticMarkup(createElement(Toaster, { theme: "light" }));
afterEach(() => sileo.clear());

describe("real Sileo notification slots", () => {
  it("keeps both feed actions when a normal success toast also appears", () => {
    showAdminNotification(
      item("customer:a", "Novo cadastro Alfa"),
      context,
      () => {},
    );
    showAdminNotification(
      item("order:b", "Novo pedido Beta", "order"),
      context,
      () => {},
    );
    notify.success("Alteração salva");
    const html = markup();
    expect(html).toContain("Novo cadastro Alfa");
    expect(html).toContain("Ver cliente");
    expect(html).toContain("Novo pedido Beta");
    expect(html).toContain("Ver pedido");
    expect(html).toContain("Alteração salva");
  });
  it("updates the same event without duplicating it and isolates user/workspace slots", () => {
    const event = item("customer:a", "Evento único");
    const original = showAdminNotification(event, context, () => {});
    expect(showAdminNotification(event, context, () => {})).toBe(original);
    expect(markup().match(/Evento único/g)).toHaveLength(1);
    expect(
      showAdminNotification(event, { ...context, userId: "staff-b" }, () => {}),
    ).not.toBe(original);
    expect(
      showAdminNotification(
        event,
        { ...context, scope: "notifications:empty" },
        () => {},
      ),
    ).not.toBe(original);
    expect(markup().match(/Evento único/g)).toHaveLength(3);
  });
  it("keeps the aggregate notice separate from individual event actions", () => {
    showAdminNotification(
      item("customer:a", "Cadastro individual"),
      context,
      () => {},
    );
    showNotificationOverflow(4, context, () => {});
    showNotificationOverflow(7, context, () => {});
    const html = markup();
    expect(html).toContain("Cadastro individual");
    expect(html).toContain("Ver cliente");
    expect(html).toContain("Mais 7 novidades");
    expect(html).not.toContain("Mais 4 novidades");
    expect(html).toContain("Ver todas");
  });
});
