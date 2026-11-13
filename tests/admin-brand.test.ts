import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { brandSettingsSchema } from "@/entities/site-content";
import { AdminLogo } from "@/widgets/admin-shell/ui/AdminLogo";

const render = (options: Parameters<typeof AdminLogo>[0]) =>
  renderToStaticMarkup(createElement(AdminLogo, options));
const sources = (html: string) =>
  [...html.matchAll(/<img[^>]*class="([^"]+)"[^>]*src="([^"]+)"/g)].map(
    ([, theme, src]) => ({ theme, src }),
  );

describe("administrative brand variants", () => {
  it("preserves the official full and compact artwork when settings are missing", () => {
    expect(sources(render({ className: "admin-wordmark" }))).toEqual([
      { theme: "admin-logo-light", src: "/img/logo-cor.svg" },
      { theme: "admin-logo-dark", src: "/img/logo-claro.svg" },
    ]);
    expect(
      sources(render({ className: "admin-brandmark", compact: true })),
    ).toEqual([
      { theme: "admin-logo-light", src: "/img/bi-escuro.svg" },
      { theme: "admin-logo-dark", src: "/img/bi-claro.svg" },
    ]);
  });

  it("uses clear artwork on dark surfaces and dark artwork on light surfaces, including compact variants", () => {
    const brand = brandSettingsSchema.parse({
      logoLight: "/img/logo-white.png",
      logoDark: "/img/logo-black.png",
      compactLight: "/img/mark-white.png",
      compactDark: "/img/mark-black.png",
    });
    expect(sources(render({ className: "admin-wordmark", brand }))).toEqual([
      { theme: "admin-logo-light", src: "/img/logo-black.png" },
      { theme: "admin-logo-dark", src: "/img/logo-white.png" },
    ]);
    expect(
      sources(render({ className: "admin-brandmark", compact: true, brand })),
    ).toEqual([
      { theme: "admin-logo-light", src: "/img/mark-black.png" },
      { theme: "admin-logo-dark", src: "/img/mark-white.png" },
    ]);
  });

  it("keeps the original compact monogram when only a full logo is configured", () => {
    const brand = brandSettingsSchema.parse({
      logoLight: "/img/custom-white.png",
      logoDark: "/img/custom-black.png",
      compactLight: "/img/custom-mark-white.png",
    });
    expect(
      sources(render({ className: "admin-brandmark", compact: true, brand })),
    ).toEqual([
      { theme: "admin-logo-light", src: "/img/bi-escuro.svg" },
      { theme: "admin-logo-dark", src: "/img/custom-mark-white.png" },
    ]);
  });

  it("renders both variants during SSR and uses the configured business name without duplicate image announcements", () => {
    const html = render({
      className: "tlg",
      name: "Empresa & Luz",
      brand: brandSettingsSchema.parse({}),
    });
    expect(html).toContain('role="img" aria-label="Empresa &amp; Luz"');
    expect(sources(html)).toHaveLength(2);
    expect(html.match(/alt=""/g)).toHaveLength(2);
  });
});
