import { Dashboard } from "@/components/admin/views/Dashboard";
import { getRepo } from "@/server/admin/repo";

export const metadata = { title: "Início" };

export default async function Inicio() {
  const me = await (await getRepo()).me();
  return <Dashboard name={me?.name ?? ""} />;
}
