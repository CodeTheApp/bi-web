import { Suspense } from "react";
import { AnalyticsPage } from "@/_pages/admin-analytics";
export const metadata = { title: "Analytics" };
export default function Page() { return <Suspense fallback={<div className="card empty">Carregando analytics…</div>}><AnalyticsPage /></Suspense>; }
