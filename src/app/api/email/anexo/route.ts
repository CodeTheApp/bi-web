import { NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/server/admin/repo";
import { resend } from "@/server/email";

/** Abre um anexo de e-mail recebido (só para a equipe). O Resend gera um link temporário a cada pedido. */
export async function GET(req: NextRequest) {
  const repo = await getRepo().catch(() => null);
  if (!repo || !(await repo.me())) return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  const emailId = req.nextUrl.searchParams.get("email") ?? "";
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const { data, error } = await resend().emails.receiving.attachments.get({ emailId, id });
  if (error || !data) return NextResponse.json({ error: "anexo indisponível" }, { status: 404 });
  return NextResponse.redirect(data.download_url);
}
