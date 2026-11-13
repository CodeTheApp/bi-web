import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  Heart,
  Menu,
  Package,
  Sun,
  type LucideProps,
} from "@/shared/ui/icons/lucide";
import {
  ADMIN_ROUTES,
  QUICK_DESTINATIONS,
  currentAdminRoute,
} from "@/widgets/admin-shell/model/navigation";

describe("shared animated Lucide SVG contract", () => {
  it.each([Heart, Menu, Package, Sun])(
    "renders an SVG root and forwards props without a wrapper",
    (Icon) => {
      const props: LucideProps & { "data-part": string } = {
        size: 19,
        strokeWidth: 1.5,
        className: "control-icon",
        "aria-label": "Ação",
        "data-part": "sun",
      };
      const markup = renderToStaticMarkup(createElement(Icon, props));
      expect(markup).toMatch(/^<svg /);
      expect(markup).not.toContain("<div");
      expect(markup).toContain('width="19"');
      expect(markup).toContain('stroke-width="1.5"');
      expect(markup).toContain('data-part="sun"');
      expect(markup).toContain('aria-label="Ação"');
      expect(markup).toContain("control-icon");
      expect(markup).not.toContain('aria-hidden="true"');
    },
  );

  it("uses the same component for a destination in the sidebar, submenu and marking menu", () => {
    for (const item of QUICK_DESTINATIONS) {
      expect(item.icon).toBe(
        ADMIN_ROUTES.find((route) => route.href === item.id)?.icon,
      );
    }
    expect(currentAdminRoute("/admin/loja/pedidos/123").href).toBe(
      "/admin/loja/pedidos",
    );
    expect(currentAdminRoute("/admin/paginas").href).toBe("/admin/paginas");
  });
});
