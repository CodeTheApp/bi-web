import { Suspense } from "react";
import { CouponsPage } from "@/_pages/admin-coupons";
export const metadata = { title: "Cupons" };
export default function Page() {
  return (
    <Suspense fallback={<div className="card empty">Carregando cupons…</div>}>
      <CouponsPage />
    </Suspense>
  );
}
