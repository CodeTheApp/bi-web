"use client";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Choice } from "@/shared/ui/admin/ui";
import { ORDER_STATUS, ORDER_STATUS_LABEL } from "@/entities/order";
import type { AnalyticsControls } from "../model/use-shop-analytics";

export function AnalyticsFilters({ controls, finance = false }: { controls: AnalyticsControls; finance?: boolean }) {
  const { filters, updateFilters: setFilters, reset } = controls;
  return (
    <div className="card analytics-filters" aria-label="Filtros do relatório">
      <div className="f"><span>Período</span><Choice label="Período do relatório" value={filters.periodo} options={[["mes", "Este mês"], ["7d", "Últimos 7 dias"], ["30d", "Últimos 30 dias"], ["90d", "Últimos 90 dias"], ["ano", "Este ano"], ["tudo", "Todo o histórico"], ["personalizado", "Personalizado"]]} onChange={(periodo) => void setFilters({ periodo })} /></div>
      {filters.periodo === "personalizado" && <>
        <label className="f">De<Input type="date" value={filters.de} onChange={(event) => void setFilters({ de: event.target.value })} /></label>
        <label className="f">Até<Input type="date" value={filters.ate} min={filters.de || undefined} onChange={(event) => void setFilters({ ate: event.target.value })} /></label>
      </>}
      <div className="f"><span>Pagamento</span><Choice label="Meio de pagamento" value={filters.pagamento} options={[["todos", "Todos os meios"], ["pix", "Pix"], ["cartao", "Cartão"], ["manual", "Sem método registrado"]]} onChange={(pagamento) => void setFilters({ pagamento })} /></div>
      {finance ? <div className="f"><span>Movimento</span><Choice label="Tipo de movimento financeiro" value={filters.movimento} options={[["todos", "Todos os movimentos"], ["recebido", "Pagamentos aprovados"], ["estorno", "Estornos"], ["aguardando", "Aguardando pagamento"]]} onChange={(movimento) => void setFilters({ movimento })} /></div>
        : <div className="f"><span>Situação</span><Choice label="Situação dos pedidos" value={filters.situacao} options={[["todos", "Todas as situações"], ...ORDER_STATUS.map((status) => [status, ORDER_STATUS_LABEL[status]] as [typeof status, string])]} onChange={(situacao) => void setFilters({ situacao })} /></div>}
      <label className="f analytics-search">Buscar pedido ou cliente<Input type="search" placeholder="Número ou nome" value={filters.busca} onChange={(event) => void setFilters({ busca: event.target.value })} /></label>
      <Button variant="ghost" size="sm" onClick={() => void reset()}>Limpar</Button>
    </div>
  );
}
