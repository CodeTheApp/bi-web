import "@/styles/loja.css";
import type { Metadata } from "next";
import { FavoritesView } from "@/components/site/shop/FavoritesView";

export const metadata: Metadata = { title: "Favoritos · Loja", robots: { index: false, follow: true } };

export default function FavoritosPage() {
  return (
    <main className="shop fav-page">
      <div className="wrap">
        <FavoritesView />
      </div>
    </main>
  );
}
