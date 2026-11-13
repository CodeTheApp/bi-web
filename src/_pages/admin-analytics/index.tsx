import { PageHead } from "@/shared/ui/admin/ui";
import { Suspense } from "react";
import {
  AnalyticsOverview,
  AnalyticsOverviewLoading,
} from "@/widgets/analytics-overview";
export function AnalyticsPage() {
  return (
    <>
      <PageHead
        title="Analytics"
        sub="Visitas, interações e resultados da loja em um só lugar."
      />
      <Suspense fallback={<AnalyticsOverviewLoading />}>
        <AnalyticsOverview />
      </Suspense>
    </>
  );
}
