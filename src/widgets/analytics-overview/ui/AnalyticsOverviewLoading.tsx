import { AdminBlockLoading } from "@/shared/ui/admin/AdminBlockLoading";
import "./analytics-overview.css";

export function AnalyticsOverviewLoading() {
  return (
    <div className="analytics-overview" aria-label="Carregando visão geral">
      <div className="analytics-overview-charts">
        <div className="analytics-chart-frame">
          <AdminBlockLoading label="Carregando pagamentos" minHeight={360} />
        </div>
        <div className="analytics-chart-frame">
          <AdminBlockLoading label="Carregando visualizações" minHeight={360} />
        </div>
      </div>
    </div>
  );
}
