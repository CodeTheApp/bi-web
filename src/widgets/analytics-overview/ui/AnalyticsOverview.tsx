"use client";
import Link from "next/link";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { dateRange } from "@/entities/shop-analytics/model";
import { Choice } from "@/shared/ui/admin/ui";
import { Button, buttonVariants } from "@/shared/ui/button";
import { Icon } from "@/shared/ui/admin/icons";
import { siteAnalyticsKey, shopAnalyticsKey } from "../model/queries";
import {
  AnalyticsSourceNote,
  CategorySales,
  PaymentsChart,
  PopularPages,
  ShopMetrics,
  StoreInteractions,
  TrafficMetrics,
  VisitsChart,
} from "./AnalyticsBlocks";
import "./analytics-overview.css";

const periodParser = parseAsStringLiteral([
  "7d",
  "30d",
  "90d",
] as const).withDefault("30d");
export function AnalyticsOverview({ compact = false }: { compact?: boolean }) {
  const [period, setPeriod] = useQueryState(
    "periodo",
    periodParser.withOptions({ shallow: true, scroll: false }),
  );
  const client = useQueryClient();
  const refreshing =
    useIsFetching({ queryKey: shopAnalyticsKey }) +
    useIsFetching({ queryKey: siteAnalyticsKey });
  const days = Number.parseInt(period, 10);
  const range = dateRange(period);
  const changePeriod = (value: number) => {
    if ([7, 30, 90].includes(value))
      void setPeriod(`${value}d` as typeof period);
  };
  return (
    <section
      className={`analytics-overview${compact ? " is-compact" : ""}`}
      aria-label="Visão geral de desempenho"
    >
      <div className="analytics-overview-head">
        <div>
          <h2>{compact ? "Desempenho em um olhar" : "Tráfego e resultados"}</h2>
          <p>O que acontece no site e na loja, com atualização automática.</p>
        </div>
        <div className="analytics-overview-controls">
          <Choice
            label="Período dos gráficos"
            value={period}
            options={[
              ["7d", "Últimos 7 dias"],
              ["30d", "Últimos 30 dias"],
              ["90d", "Últimos 90 dias"],
            ]}
            onChange={(value) => void setPeriod(value)}
          />
          <Button
            variant="ghost"
            size="sm"
            aria-label="Atualizar analytics"
            disabled={refreshing > 0}
            onClick={() => {
              void client.invalidateQueries({ queryKey: shopAnalyticsKey });
              void client.invalidateQueries({ queryKey: siteAnalyticsKey });
            }}
          >
            <Icon name="clock" />
          </Button>
          {compact && (
            <Link
              className={buttonVariants({ variant: "outline", size: "sm" })}
              href="/admin/analytics"
            >
              Abrir analytics
              <Icon name="ext" />
            </Link>
          )}
        </div>
      </div>
      <div className="analytics-overview-charts">
        <PaymentsChart days={days} onPeriodChange={changePeriod} />
        <VisitsChart days={days} onPeriodChange={changePeriod} />
      </div>
      <div className="analytics-overview-metrics">
        <TrafficMetrics range={range} />
        <ShopMetrics range={range} />
      </div>
      {!compact && (
        <>
          <div className="analytics-overview-details">
            <PopularPages range={range} />
            <CategorySales range={range} />
          </div>
          <StoreInteractions range={range} />
        </>
      )}
      <AnalyticsSourceNote />
    </section>
  );
}
