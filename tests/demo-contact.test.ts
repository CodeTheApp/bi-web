import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const dependencies = vi.hoisted(() => ({ sendEmail: vi.fn(), headers: vi.fn(), db: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: dependencies.headers }));
vi.mock("@/shared/api/supabase/env", () => ({ hasSupabase: false }));
vi.mock("@/shared/api/supabase/server", () => ({ createSupabaseService: dependencies.db }));
vi.mock("@/server/email", () => ({
  isEmail: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  sendEmail: dependencies.sendEmail,
  TEAM_TO: () => ["team@example.test"],
  threadReplyTo: () => "reply@example.test",
}));
import { sendContact } from "@/server/actions/contact";
import { demoRepo, getDemoAdminStore } from "@/server/admin/repo-demo";
import { receiveDemoContact } from "@/server/admin/demo-contact";
import { setDemoDataMode } from "@/server/demo-workspace";

const form = (overrides: Record<string, string> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ nome: "Pessoa de teste", contato: "pessoa@example.test", cidade: "Brasília / DF", busca: "Projeto completo", msg: "Gostaria de conversar sobre a iluminação da minha casa.", website: "", ...overrides })) data.set(key, value);
  return data;
};
beforeEach(() => {
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  dependencies.headers.mockResolvedValue(new Headers());
});
afterEach(() => {
  const memory = globalThis as Record<string, unknown>;
  for (const key of ["__biDemo", "__biDemoEmpty", "__biDemoWorkspace"]) delete memory[key];
  vi.clearAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals();
});

describe("contact submissions in demonstration", () => {
  it("creates a new unread conversation and inbound message without sending any external e-mail", async () => {
    setDemoDataMode("empty");
    const result = await sendContact({ ok: false }, form());
    expect(result.ok).toBe(true);
    const repo = demoRepo();
    const threads = await repo.threads();
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ source: "formulario", name: "Pessoa de teste", email: "pessoa@example.test", phone: "", city: "Brasília / DF", interest: "Projeto completo", status: "novo", unread: true, lastOut: false });
    const detail = await repo.thread(threads[0].id);
    expect(detail?.messages).toMatchObject([{ id: expect.any(String), direction: "in", from: "pessoa@example.test", body: "Gostaria de conversar sobre a iluminação da minha casa.", delivery: null }]);
    expect((await repo.dashboard()).recent[0].id).toBe(threads[0].id);
    expect(dependencies.sendEmail).not.toHaveBeenCalled();
    expect(dependencies.db).not.toHaveBeenCalled();
    setDemoDataMode("examples");
    expect((await demoRepo().threads()).some((thread) => thread.id === threads[0].id)).toBe(false);
  });

  it("captures the selected workspace before awaiting verification, even if another tab switches it", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-for-test");
    dependencies.headers.mockImplementationOnce(async () => { setDemoDataMode("empty"); return new Headers(); });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }));
    expect((await sendContact({ ok: false }, form({ "cf-turnstile-response": "token" }))).ok).toBe(true);
    expect(await demoRepo().threads()).toEqual([]);
    const examples = getDemoAdminStore("examples");
    expect(examples.threads.find((thread) => thread.email === "pessoa@example.test")?.unread).toBe(true);
    expect(dependencies.sendEmail).not.toHaveBeenCalled();
  });

  it("keeps validation, honeypot and failed verification from adding conversations or sending email", async () => {
    setDemoDataMode("empty");
    expect((await sendContact({ ok: false }, form({ nome: "" }))).ok).toBe(false);
    expect((await sendContact({ ok: false }, form({ website: "https://spam.example" }))).ok).toBe(true);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-for-test");
    expect((await sendContact({ ok: false }, form())).ok).toBe(false);
    expect(await demoRepo().threads()).toEqual([]);
    expect(dependencies.sendEmail).not.toHaveBeenCalled();
  });

  it("preserves telephone contact details and refuses direct helper use outside demo", () => {
    const data = { nome: "Pessoa", contato: "+55 61 99999-0000", cidade: "", busca: "", msg: "Olá" };
    const ids = receiveDemoContact(data, "empty");
    expect(getDemoAdminStore("empty").threads.find((thread) => thread.id === ids.threadId)).toMatchObject({ email: "", phone: "+55 61 99999-0000", subject: "Contato — Pessoa", messages: [{ from: "+55 61 99999-0000" }] });
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("ADMIN_DEMO", "0");
    expect(() => receiveDemoContact(data, "empty")).toThrow(/demonstração/);
    expect(getDemoAdminStore("empty").threads).toHaveLength(1);
  });
});
