"use client";
import { useActionState, useState } from "react";
import { signIn } from "@/server/admin/actions";
import { requestReset, setPassword } from "@/server/admin/auth";

export function LoginForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [state, action, pending] = useActionState(signIn, {});
  const [rs, resetAction, resetting] = useActionState(requestReset, {});
  return mode === "login" ? (
    <form action={action}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mlg" src="/img/logo-cor.svg" alt="Brasília Iluminação" />
      <h1>Painel</h1>
      <p>Entre para editar o site e responder os contatos.</p>
      {linkError && <p className="err">O link expirou ou já foi usado. Peça um novo em “Esqueci a senha”.</p>}
      <input type="hidden" name="next" value={next} />
      <label className="f">
        E-mail
        <input className="in" type="email" name="email" autoComplete="username" required />
      </label>
      <label className="f">
        Senha
        <input className="in" type="password" name="password" autoComplete="current-password" required />
      </label>
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <button className="btn pri" type="submit" style={{ justifyContent: "center", padding: 13 }} disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setMode("reset")}>
        Esqueci a senha
      </button>
    </form>
  ) : (
    <form action={resetAction}>
      <h1>Nova senha</h1>
      <p>Enviamos um link para o seu e-mail.</p>
      <label className="f">
        E-mail
        <input className="in" type="email" name="email" autoComplete="username" required />
      </label>
      {rs.msg && <p className="muted" role="status">{rs.msg}</p>}
      <button className="btn pri" type="submit" style={{ justifyContent: "center", padding: 13 }} disabled={resetting}>
        Enviar link
      </button>
      <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start" }} onClick={() => setMode("login")}>
        Voltar para o login
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(setPassword, {});
  return (
    <form action={action}>
      <h1>Crie sua senha</h1>
      <p>Use pelo menos 10 caracteres.</p>
      <label className="f">
        Nova senha
        <input className="in" type="password" name="password" autoComplete="new-password" required minLength={10} />
      </label>
      <label className="f">
        Repita a senha
        <input className="in" type="password" name="password2" autoComplete="new-password" required minLength={10} />
      </label>
      {state.error && <p className="err" role="alert">{state.error}</p>}
      <button className="btn pri" type="submit" style={{ justifyContent: "center", padding: 13 }} disabled={pending}>
        Salvar e entrar
      </button>
    </form>
  );
}

export function LoginArt() {
  return (
    <div className="art">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="bg" src="/img/vip-lounge.jpg" alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="lg" src="/img/logo-claro.svg" alt="Brasília Iluminação" />
      <p className="q">
        Onde a luz vira <em>emoção</em> na sua vida.
      </p>
    </div>
  );
}
