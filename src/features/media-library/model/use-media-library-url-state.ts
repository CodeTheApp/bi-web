"use client";
import { debounce, useQueryStates } from "nuqs";
import { mediaLibraryParsers } from "./query-state";
export function useMediaLibraryUrlState() {
  const [state, set] = useQueryStates(mediaLibraryParsers, {
    history: "replace",
    shallow: true,
    scroll: false,
  });
  return {
    query: state.q,
    category: state.categoria,
    previewId: state.foto,
    setQuery: (q: string) => {
      void set(
        { q, foto: null },
        { limitUrlUpdates: q ? debounce(250) : undefined },
      );
    },
    setCategory: (categoria: string) => {
      void set({ categoria, foto: null });
    },
    setPreviewId: (foto: string | null) => {
      void set({ foto }, { history: foto ? "push" : "replace" });
    },
  };
}
