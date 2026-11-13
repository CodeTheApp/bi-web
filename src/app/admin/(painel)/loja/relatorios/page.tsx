import { Suspense } from "react";
import { ReportsPage } from "@/_pages/admin-reports/index";

export const metadata = { title: "Relatórios da loja" };
export default function Page() { return <Suspense fallback={<div className="card empty">Carregando relatórios…</div>}><ReportsPage /></Suspense>; }
