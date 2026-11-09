import "@/styles/loja.css";
import "@/styles/conta.css";
import type { Metadata } from "next";
import { Account } from "@/components/site/shop/Account";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false, follow: false } };

export default function ContaPage() {
  return (
    <main className="shop co-page">
      <div className="wrap">
        <Account />
      </div>
    </main>
  );
}
