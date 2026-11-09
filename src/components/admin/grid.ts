import type { DataGridI18nOverrides } from "@/components/reui/data-grid/data-grid-i18n";

/** Textos do Data Grid (ReUI) em português. */
export const GRID_PT: DataGridI18nOverrides = {
  labels: {
    sortAscending: "Crescente",
    sortDescending: "Decrescente",
    selectRow: "Selecionar linha",
    selectAll: "Selecionar todos",
    loading: "Carregando…",
    empty: "Nada por aqui.",
    rowsPerPage: "Por página",
    paginationInfo: ({ from, to, count }) => `${from}–${to} de ${count}`,
    previousPage: "Página anterior",
    nextPage: "Próxima página",
    goToPage: (page) => `Ir para a página ${page}`,
  },
};
