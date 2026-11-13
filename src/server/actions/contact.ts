"use server";
import { headers } from "next/headers";
import { ContactConfirmation, ContactNotification } from "@/emails/ContactEmails";
import { contactSchema } from "@/entities/site-content";
import { hasSupabase } from "@/shared/api/supabase/env";
import { createSupabaseService } from "@/shared/api/supabase/server";
import { isEmail, sendEmail, TEAM_TO, threadReplyTo } from "@/server/email";
import { getDemoDataMode } from "@/server/demo-workspace";
import { receiveDemoContact } from "@/server/admin/demo-contact";

export type ContactState = { ok: boolean; message?: string; errors?: Partial<Record<"nome" | "contato" | "form", string>> };

async function verifyTurnstile(token: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // proteção desligada
  if (!token) return false;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const j = (await r.json()) as { success?: boolean };
    return Boolean(j.success);
  } catch {
    return false;
  }
}

/** Formulário de contato do site: grava a conversa no Supabase e avisa a equipe por e-mail. */
export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  const demoMode = !hasSupabase ? getDemoDataMode() : null;
  const raw = Object.fromEntries(["nome", "contato", "cidade", "busca", "msg", "website"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0];
      if (k === "nome" || k === "contato") errors[k] ??= issue.message;
      else if (k === "website") return { ok: true }; // robô: finge que deu certo
    }
    return { ok: false, errors: Object.keys(errors).length ? errors : { form: "Confira os campos e tente de novo." } };
  }
  if (!(await verifyTurnstile(form.get("cf-turnstile-response") as string | null))) {
    return { ok: false, errors: { form: "Não conseguimos confirmar que você não é um robô. Tente de novo." } };
  }

  const d = parsed.data;
  if (demoMode) {
    try {
      receiveDemoContact(d, demoMode);
      return { ok: true, message: "Obrigada! Retornamos em breve. ✦" };
    } catch (error) {
      console.error("[contato] falha ao gravar conversa de demonstração", error);
      return { ok: false, errors: { form: "Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp." } };
    }
  }
  const email = isEmail(d.contato) ? d.contato.trim().toLowerCase() : "";
  const phone = email ? "" : d.contato;
  const subject = `${d.busca || "Contato"} — ${d.nome}`;

  let threadId: string | null = null;
  if (hasSupabase && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const db = createSupabaseService();
    const { data: thread, error } = await db
      .from("threads")
      .insert({ subject, contact_name: d.nome, contact_email: email, contact_phone: phone, city: d.cidade, interest: d.busca, source: "formulario" })
      .select("id")
      .single();
    if (error || !thread) {
      console.error("[contato] falha ao gravar conversa", error);
      return { ok: false, errors: { form: "Não foi possível enviar agora. Tente de novo ou fale pelo WhatsApp." } };
    }
    threadId = thread.id;
    await db.from("messages").insert({ thread_id: thread.id, direction: "in", from_email: email || phone, body_text: d.msg });
  }

  const team = TEAM_TO();
  if (team.length) {
    await sendEmail({
      to: team,
      subject: `Novo contato pelo site: ${d.nome}`,
      react: ContactNotification({ data: d }),
      replyTo: email || undefined,
    });
  }
  if (email) {
    await sendEmail({
      to: email,
      subject: "Recebemos a sua mensagem — Brasília Iluminação",
      react: ContactConfirmation({ name: d.nome }),
      replyTo: threadId ? threadReplyTo(threadId) : undefined,
    });
  }
  return { ok: true, message: "Obrigada! Retornamos em breve. ✦" };
}
