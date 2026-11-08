import "server-only";
import type { ReactElement } from "react";
import { Resend } from "resend";

let client: Resend | null = null;
export const resend = () => (client ??= new Resend(process.env.RESEND_API_KEY));

export const hasEmail = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
export const EMAIL_FROM = () => process.env.EMAIL_FROM ?? "Brasília Iluminação <contato@brasiliailuminacao.com.br>";
export const TEAM_TO = () => (process.env.EMAIL_TEAM_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/**
 * Endereço de resposta de uma conversa: com EMAIL_INBOUND_DOMAIN configurado, a resposta do cliente
 * chega no webhook de entrada já com o id da conversa (t-<uuid>@dominio).
 */
export function threadReplyTo(threadId: string) {
  const domain = process.env.EMAIL_INBOUND_DOMAIN;
  return domain ? `t-${threadId}@${domain}` : undefined;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

type Send = { to: string | string[]; subject: string; react: ReactElement; replyTo?: string; headers?: Record<string, string> };

/** Envia e devolve o id do Resend (ou null se o e-mail não estiver configurado / falhar). */
export async function sendEmail({ to, subject, react, replyTo, headers }: Send) {
  if (!hasEmail()) {
    console.info(`[email] RESEND_API_KEY ausente — e-mail não enviado: "${subject}"`);
    return null;
  }
  const { data, error } = await resend().emails.send({ from: EMAIL_FROM(), to, subject, react, replyTo, headers });
  if (error) {
    console.error("[email] falha no envio", error);
    return null;
  }
  return data?.id ?? null;
}
