import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Volta do login com Google (Supabase): abre a sessão e devolve a pessoa para onde estava. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = url.searchParams.get("next") ?? "/conta";
  // só caminhos do próprio site, nunca outro domínio
  const safeNext = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/admin") ? next : "/conta";
  const code = url.searchParams.get("code");
  let ok = false;
  if (code) {
    const db = await createSupabaseServer();
    ok = !(await db.auth.exchangeCodeForSession(code)).error;
  }
  return NextResponse.redirect(new URL(ok ? safeNext : "/conta?erro=login", url.origin));
}
