import { redirect } from "next/navigation";
import { AdminShell } from "@/widgets/admin-shell";
import { demoAllowed, getRepo } from "@/server/admin/repo";
import { getDemoDataMode } from "@/server/demo-workspace";
import { brandOf, companyOf, normalizeSettings } from "@/entities/site-content";

export const dynamic = "force-dynamic";

export default async function PainelLayout({ children }: LayoutProps<"/admin">) {
  const demoWorkspace = demoAllowed() ? getDemoDataMode() : undefined;
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
  // Brand is part of the authenticated layout payload, never a second browser query.
  const settings = await repo.settings().then(normalizeSettings).catch(() => undefined);
  const effectiveBrand = settings ? brandOf(settings) : undefined;
  const brand = settings && effectiveBrand ? {
    ...settings.brand,
    logoLight: effectiveBrand.logoLight,
    logoDark: effectiveBrand.logoDark,
  } : undefined;
  const brandName = settings ? companyOf(settings).commercialName : undefined;
  return (
    <AdminShell me={me} demo={repo.mode === "demo"} realtime={repo.mode === "supabase"} demoWorkspace={demoWorkspace} brand={brand} brandName={brandName}>
      {children}
    </AdminShell>
  );
}
