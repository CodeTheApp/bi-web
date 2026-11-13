import { Suspense } from "react";
import { FinancePage } from "@/_pages/admin-finance/index";

export const metadata = { title: "Financeiro" };
export default function Page() { return <Suspense fallback={<div className="card empty">Carregando financeiro…</div>}><FinancePage /></Suspense>; }
