import "server-only";
import { z } from "zod";
import { getRepo } from "./repo";

/** Toda função do painel passa por aqui: exige alguém da equipe logado (ou o modo demonstração). */
export async function ctx(opts: { admin?: boolean } = {}) {
  const repo = await getRepo();
  const me = await repo.me();
  if (!me) throw new Error("Sessão expirada. Entre de novo.");
  if (opts.admin && me.role !== "admin") throw new Error("Só administradores podem fazer isso.");
  return { repo, me };
}

import type { Result } from "@/shared/api/result";
export type { Result } from "@/shared/api/result";

/** Em produção o Next esconde a mensagem de erros lançados; por isso as ações devolvem o erro como dado. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Dados inválidos." };
    console.error("[painel]", e);
    return { ok: false, error: e instanceof Error ? e.message : "Algo deu errado." };
  }
}
