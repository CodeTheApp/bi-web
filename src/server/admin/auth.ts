"use server";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/shared/api/supabase/env";
import { createSupabaseServer } from "@/shared/api/supabase/server";

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** "Esqueci a senha": o Supabase manda um link que volta para /admin/auth/confirm e depois /admin/senha. */
export async function requestReset(_prev: { msg?: string }, form: FormData): Promise<{ msg?: string }> {
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { msg: "Informe o e-mail." };
  if (hasSupabase) {
    const db = await createSupabaseServer();
    await db.auth.resetPasswordForEmail(email, { redirectTo: `${SITE()}/admin/auth/confirm?next=/admin/senha` });
  }
  // mesma resposta exista ou não a conta (não revela quem tem acesso)
  return { msg: "Se o e-mail tiver acesso ao painel, enviamos um link para criar uma nova senha." };
}

export async function setPassword(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const pw = String(form.get("password") ?? "");
  const pw2 = String(form.get("password2") ?? "");
  if (pw.length < 10) return { error: "Use pelo menos 10 caracteres." };
  if (pw !== pw2) return { error: "As senhas não conferem." };
  if (!hasSupabase) redirect("/admin");
  const db = await createSupabaseServer();
  const { error } = await db.auth.updateUser({ password: pw });
  if (error) return { error: "O link expirou. Peça um novo em “Esqueci a senha”." };
  redirect("/admin");
}
