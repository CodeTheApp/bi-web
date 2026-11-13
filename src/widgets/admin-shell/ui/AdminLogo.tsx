"use client";

import type { BrandSettings } from "@/entities/site-content";

/** Light artwork is shown on a dark surface; both variants exist before hydration. */
export function AdminLogo({
  className,
  compact = false,
  brand,
  name = "Brasília Iluminação",
}: {
  className: string;
  compact?: boolean;
  brand?: BrandSettings;
  name?: string;
}) {
  const lightFallback = compact ? "/img/bi-escuro.svg" : "/img/logo-cor.svg";
  const darkFallback = compact ? "/img/bi-claro.svg" : "/img/logo-claro.svg";
  const light =
    (compact ? brand?.compactDark : brand?.logoDark) || lightFallback;
  const dark =
    (compact ? brand?.compactLight : brand?.logoLight) || darkFallback;
  return (
    <span className={className} role="img" aria-label={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="admin-logo-light"
        src={light}
        alt=""
        onError={(event) => {
          if (event.currentTarget.getAttribute("src") !== lightFallback)
            event.currentTarget.src = lightFallback;
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="admin-logo-dark"
        src={dark}
        alt=""
        onError={(event) => {
          if (event.currentTarget.getAttribute("src") !== darkFallback)
            event.currentTarget.src = darkFallback;
        }}
      />
    </span>
  );
}
