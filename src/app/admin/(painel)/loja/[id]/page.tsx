import { ProductEditor } from "@/_pages/admin-products/ui/Shop";

export const metadata = { title: "Produto" };

export default async function Page({ params }: PageProps<"/admin/loja/[id]">) {
  const { id } = await params;
  return <ProductEditor id={id} />;
}
