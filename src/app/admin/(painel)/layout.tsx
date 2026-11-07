import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { getRepo } from "@/server/admin/repo";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  let repo;
  try {
    repo = await getRepo();
  } catch (e) {
    return (
      <div style={{ maxWidth: 560, margin: "12vh auto", padding: 24 }} className="card pad">
        <h1 className="serif" style={{ fontSize: 30, marginBottom: 10 }}>Painel não configurado</h1>
        <p className="muted">{e instanceof Error ? e.message : ""}</p>
        <p className="muted">Veja o passo a passo no README do projeto (seção “Supabase”).</p>
      </div>
    );
  }
  const me = await repo.me();
  if (!me) redirect("/admin/login");
  return (
    <AdminShell me={me} demo={repo.mode === "demo"} realtime={repo.mode === "supabase"}>
      {children}
    </AdminShell>
  );
}
