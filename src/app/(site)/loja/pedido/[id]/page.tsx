import "@/styles/loja.css";
import "@/styles/conta.css";
import type { Metadata } from "next";
import { OrderView } from "@/components/site/shop/OrderView";
import { getShopRepo } from "@/server/shop/repo";

export const metadata: Metadata = { title: "Pedido", robots: { index: false, follow: false } };

export default async function PedidoPage({ params }: PageProps<"/loja/pedido/[id]">) {
  const { id } = await params;
  const order = await getShopRepo()
    .then((s) => s.myOrder(id))
    .catch(() => null);
  return (
    <main className="shop co-page">
      <div className="wrap">
        <OrderView id={id} initial={order} />
      </div>
    </main>
  );
}
