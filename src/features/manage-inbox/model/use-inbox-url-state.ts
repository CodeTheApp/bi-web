"use client";
import { debounce, useQueryStates } from "nuqs";
import { inboxParsers, type INBOX_FILTERS } from "./query-state";
export function useInboxUrlState() {
  const [state, set] = useQueryStates(inboxParsers, {
    history: "replace",
    shallow: true,
    scroll: false,
  });
  return {
    q: state.q,
    filter: state.caixa,
    selected: state.t,
    setQ: (q: string) => {
      void set({ q }, { limitUrlUpdates: q ? debounce(250) : undefined });
    },
    setFilter: (caixa: (typeof INBOX_FILTERS)[number]) => {
      void set({ caixa });
    },
    open: (t: string | null) => {
      void set({ t }, { history: t ? "push" : "replace" });
    },
  };
}
