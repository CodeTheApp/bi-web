"use client";
import { ArrowRight } from "@/shared/ui/icons/lucide";

import Script from "next/script";
import { useActionState, useEffect, useRef } from "react";
import { sendContact, type ContactState } from "@/server/actions/contact";

const OPTIONS = ["Projeto completo", "Só o projeto", "Só os produtos", "Paisagismo", "Comercial"];
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function ContactForm({ cta }: { cta: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
    else if (state.errors?.nome) ref.current?.querySelector<HTMLInputElement>("[name=nome]")?.focus();
    else if (state.errors?.contato) ref.current?.querySelector<HTMLInputElement>("[name=contato]")?.focus();
  }, [state]);

  return (
    <form ref={ref} action={action} className={state.ok ? "sent" : undefined} noValidate data-stagger>
      <div className="fld full">
        <label htmlFor="f-nome">Nome</label>
        <input id="f-nome" name="nome" placeholder="Seu nome" required autoComplete="name" aria-invalid={!!state.errors?.nome} aria-describedby={state.errors?.nome ? "e-nome" : undefined} />
        {state.errors?.nome && <small className="err" id="e-nome">{state.errors.nome}</small>}
      </div>
      <div className="fld">
        <label htmlFor="f-contato">E-mail ou WhatsApp</label>
        <input id="f-contato" name="contato" placeholder="Como falar com você" required aria-invalid={!!state.errors?.contato} aria-describedby={state.errors?.contato ? "e-contato" : undefined} />
        {state.errors?.contato && <small className="err" id="e-contato">{state.errors.contato}</small>}
      </div>
      <div className="fld">
        <label htmlFor="f-cidade">Cidade / Estado</label>
        <input id="f-cidade" name="cidade" placeholder="Ex.: Brasília/DF" autoComplete="address-level2" />
      </div>
      <div className="full">
        <div className="fld" style={{ border: 0 }}>
          <label id="l-busca">O que você procura?</label>
        </div>
        <div className="chips" role="radiogroup" aria-labelledby="l-busca">
          {OPTIONS.map((o) => (
            <label key={o}>
              <input type="radio" name="busca" value={o} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="fld full">
        <label htmlFor="f-msg">Sua mensagem</label>
        <textarea id="f-msg" name="msg" placeholder="Conte um pouco sobre o seu espaço" />
      </div>
      {/* armadilha para robôs: invisível para pessoas */}
      <input className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {SITE_KEY && (
        <div className="full">
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={SITE_KEY} data-theme="dark" data-language="pt-br" />
        </div>
      )}
      <div className="full sendrow">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Enviando…" : cta || "Enviar"} <ArrowRight className="ar" size={18} strokeWidth={1.5} aria-hidden="true" />
        </button>
        <span className="ok" role="status">
          {state.ok ? state.message : ""}
        </span>
        {state.errors?.form && (
          <span className="err" role="alert">
            {state.errors.form}
          </span>
        )}
      </div>
    </form>
  );
}
