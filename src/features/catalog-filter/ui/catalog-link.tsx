"use client";
import Link from "next/link";
import { useTransition, type ComponentProps } from "react";
import { useQueryStates } from "nuqs";
import {
  catalogSearchParams,
  catalogStateFromHref,
} from "../model/search-params";

/** A real link still supports a new tab and no-JS navigation; normal clicks use typed URL state. */
export function CatalogLink({
  href,
  onClick,
  queryKeys,
  toggle,
  ...props
}: ComponentProps<typeof Link> & {
  queryKeys?: Array<keyof typeof catalogSearchParams>;
  toggle?: "pronta" | "video" | { cor: string };
}) {
  const [, startTransition] = useTransition();
  const [, setQuery] = useQueryStates(catalogSearchParams, {
    shallow: false,
    history: "push",
    scroll: false,
    startTransition,
  });
  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          typeof href !== "string"
        )
          return;
        event.preventDefault();
        if (toggle) {
          void setQuery((current) =>
            typeof toggle === "string"
              ? { [toggle]: !current[toggle], pagina: 1 }
              : {
                  cor: current.cor.includes(toggle.cor)
                    ? current.cor.filter((value) => value !== toggle.cor)
                    : [...current.cor, toggle.cor],
                  pagina: 1,
                },
          );
          return;
        }
        const next = catalogStateFromHref(href);
        // Facet clicks change only their own group, retaining other optimistic selections during a server request.
        void setQuery(
          queryKeys
            ? {
                ...Object.fromEntries(queryKeys.map((key) => [key, next[key]])),
                pagina: 1,
              }
            : next,
        );
      }}
    />
  );
}
