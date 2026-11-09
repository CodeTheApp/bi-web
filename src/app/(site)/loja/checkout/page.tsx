import "@/styles/loja.css";
import "@/styles/conta.css";
import type { Metadata } from "next";
import { Checkout } from "@/components/site/shop/Checkout";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <main className="shop co-page">
      <div className="wrap">
        <Checkout />
      </div>
    </main>
  );
}
