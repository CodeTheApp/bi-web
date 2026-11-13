import { NextResponse, type NextRequest } from "next/server";
import type { Json } from "@/shared/api/supabase/database.types";
import { hasSupabase } from "@/shared/api/supabase/env";
import { createSupabaseService } from "@/shared/api/supabase/server";
import { htmlToText, lower, parseFrom, stripQuoted } from "@/shared/lib/mail-parse";
import { EMAIL_FROM, resend } from "@/server/email";

/**
 * Webhook do Resend (configure em Resend › Webhooks, apontando para /api/email/inbound):
 *  - email.received  → e-mail que chegou em contato@ vira mensagem na caixa do painel
 *  - email.delivered / opened / bounced → atualiza o status das respostas enviadas
 * A assinatura (Svix) é verificada com RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret || !hasSupabase) return NextResponse.json({ error: "webhook não configurado" }, { status: 503 });
  const payload = await req.text();
  let event: { type: string; data: Record<string, unknown> };
  try {
    event = resend().webhooks.verify({
      payload,
      headers: { id: req.headers.get("svix-id") ?? "", timestamp: req.headers.get("svix-timestamp") ?? "", signature: req.headers.get("svix-signature") ?? "" },
      webhookSecret: secret,
    }) as unknown as typeof event;
  } catch {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const db = createSupabaseService();
  const emailId = String(event.data.email_id ?? "");

  if (event.type === "email.delivered" || event.type === "email.opened" || event.type === "email.bounced") {
    const delivery = { "email.delivered": "entregue", "email.opened": "aberto", "email.bounced": "não entregue" }[event.type];
    // "aberto" não volta para "entregue" se os eventos chegarem fora de ordem
    let q = db.from("messages").update({ delivery }).eq("provider_id", emailId);
    if (event.type === "email.delivered") q = q.neq("delivery", "aberto");
    await q;
    return NextResponse.json({ ok: true });
  }
  if (event.type !== "email.received") return NextResponse.json({ ignored: event.type });

  // idempotência: o Resend pode reenviar o mesmo evento
  const dup = await db.from("messages").select("id").eq("provider_id", emailId).maybeSingle();
  if (dup.data) return NextResponse.json({ ok: true, duplicate: true });

  const { data: email, error } = await resend().emails.receiving.get(emailId);
  if (error || !email) return NextResponse.json({ error: "não foi possível ler o e-mail" }, { status: 502 });

  const { name, address } = parseFrom(email.from);
  if (address && EMAIL_FROM().toLowerCase().includes(address)) return NextResponse.json({ ignored: "remetente próprio" });

  const headers = lower(email.headers ?? {});
  const threadId = await findThread(db, [...email.to, ...(email.received_for ?? [])], headers["in-reply-to"], headers["references"]);
  const text = stripQuoted(email.text ?? htmlToText(email.html ?? ""));
  const attachments = (email.attachments ?? []).filter((a) => a.content_disposition !== "inline").map((a) => ({ name: a.filename ?? "anexo", id: a.id, emailId }));

  let id = threadId;
  if (id) {
    const { data: t } = await db.from("threads").select("status").eq("id", id).maybeSingle();
    await db.from("threads").update({ unread: true, last_message_at: new Date().toISOString(), status: t?.status === "andamento" ? "andamento" : "novo" }).eq("id", id);
  } else {
    const { data: t, error: e } = await db
      .from("threads")
      .insert({ subject: email.subject || "(sem assunto)", contact_name: name || address, contact_email: address, source: "email" })
      .select("id")
      .single();
    if (e || !t) return NextResponse.json({ error: "falha ao criar conversa" }, { status: 500 });
    id = t.id;
  }
  await db.from("messages").insert({
    thread_id: id, direction: "in", from_email: address, to_email: email.to.join(", "), body_text: text, body_html: email.html,
    provider_id: emailId, message_id_header: email.message_id, attachments: attachments as unknown as Json,
  });
  return NextResponse.json({ ok: true, thread: id });
}

type Db = ReturnType<typeof createSupabaseService>;

/** Acha a conversa: endereço t-<id>@ do Reply-To, ou o cabeçalho In-Reply-To/References. */
async function findThread(db: Db, recipients: string[], inReplyTo?: string, references?: string) {
  for (const r of recipients) {
    const m = r.match(/t-([0-9a-f-]{36})@/i);
    if (m) {
      const { data } = await db.from("threads").select("id").eq("id", m[1]).maybeSingle();
      if (data) return data.id;
    }
  }
  const ids = [inReplyTo, ...(references ?? "").split(/\s+/)].filter((x): x is string => !!x && x.includes("@"));
  if (ids.length) {
    const { data } = await db.from("messages").select("thread_id").in("message_id_header", ids).limit(1);
    if (data?.[0]) return data[0].thread_id;
  }
  return null;
}
