import { OrderAdmin } from "@/_pages/admin-orders/ui/Orders";

export const metadata = { title: "Pedido" };

export default async function Page({ params }: PageProps<"/admin/loja/pedidos/[id]">) {
  const { id } = await params;
  return <OrderAdmin id={id} />;
}
