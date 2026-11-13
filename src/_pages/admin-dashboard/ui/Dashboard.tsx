"use client";
import { Suspense } from "react";
import Link from "next/link";
import { Icon } from "@/shared/ui/admin/icons";
import {
  AnalyticsOverview,
  AnalyticsOverviewLoading,
} from "@/widgets/analytics-overview";
import { NewProjectButton } from "@/_pages/admin-projects/ui/Projects";
import {
  DashboardActivity,
  DashboardCounters,
  DashboardMessages,
} from "./DashboardBlocks";
import "./dashboard.css";

export function Dashboard({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return (
    <div className="admin-dashboard-page">
      <div className="ph">
        <div>
          <h1 suppressHydrationWarning>
            {greeting}, {name.split(" ")[0]}
          </h1>
          <p>Um resumo do site e dos contatos de hoje.</p>
        </div>
        <NewProjectButton />
      </div>
      <Suspense fallback={<AnalyticsOverviewLoading />}>
        <AnalyticsOverview compact />
      </Suspense>
      <DashboardCounters />
      <div className="dash">
        <DashboardMessages />
        <div className="stack">
          <section className="card">
            <h3>Atalhos</h3>
            <div className="quick dashboard-quick-links">
              <Link href="/admin/paginas">
                <Icon name="pen" />
                Editar textos
              </Link>
              <Link href="/admin/projetos">
                <Icon name="folder" />
                Projetos
              </Link>
              <Link href="/admin/midia">
                <Icon name="upload" />
                Enviar fotos
              </Link>
              <Link href="/admin/depoimentos">
                <Icon name="quote" />
                Depoimentos
              </Link>
            </div>
          </section>
          <DashboardActivity />
        </div>
      </div>
    </div>
  );
}
