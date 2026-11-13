import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  normalizeSettings,
  seedContent,
  settingsChanges,
} from "@/entities/site-content";
const state = vi.hoisted(() => ({
  ctx: vi.fn(),
  settings: vi.fn(),
  users: vi.fn(),
  save: vi.fn(),
  log: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/emails/ContactEmails", () => ({ ReplyEmail: () => null }));
vi.mock("@/server/email", () => ({
  EMAIL_FROM: () => "",
  hasEmail: () => true,
  sendEmail: vi.fn(),
  threadReplyTo: vi.fn(),
}));
vi.mock("@/server/storage", () => ({
  deleteObject: vi.fn(),
  hasStorage: () => false,
  presignUpload: vi.fn(),
}));
vi.mock("@/shared/api/supabase/env", () => ({ hasSupabase: true }));
vi.mock("@/server/shop/payments", () => ({
  paymentProvider: () => ({ simulated: true }),
}));
vi.mock("@/server/content", () => ({
  TAGS: { content: "content", projects: "projects" },
}));
vi.mock("@/server/admin/repo", () => ({ getRepo: vi.fn() }));
vi.mock("@/server/admin/guard", () => ({
  ctx: state.ctx,
  run: async (fn: () => Promise<unknown>) => {
    try {
      return { ok: true, data: await fn() };
    } catch (error) {
      return { ok: false, error: (error as Error).message };
    }
  },
}));
import { getSettings, saveSettings } from "@/server/admin/actions";
import { integrationStatus } from "@/server/admin/integration-status";

describe("staff settings boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.settings.mockResolvedValue(seedContent.settings);
    state.users.mockResolvedValue([{ id: "staff", name: "Staff" }]);
    state.ctx.mockResolvedValue({
      me: { id: "admin", role: "admin" },
      repo: {
        mode: "demo",
        settings: state.settings,
        saveSettings: state.save,
        users: state.users,
        log: state.log,
      },
    });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("requires an administrator before persisting and invalidates public settings", async () => {
    const value = {
      ...seedContent.settings,
      company: { commercialName: "Aurora", city: "Goiânia, GO" },
      brand: { favicon: "/img/custom.png" },
    };
    const result = await saveSettings(value);
    expect(state.ctx).toHaveBeenCalledWith({ admin: true });
    expect(result).toMatchObject({
      ok: true,
      data: {
        company: { commercialName: "Aurora", city: "Goiânia, GO" },
        brand: { favicon: "/img/custom.png" },
      },
    });
    expect(state.save).toHaveBeenCalledOnce();
    state.ctx.mockRejectedValueOnce(
      new Error("Só administradores podem fazer isso."),
    );
    expect((await saveSettings(value)).ok).toBe(false);
    expect(state.save).toHaveBeenCalledOnce();
  });
  it("preserves custom contacts and sibling fields when a caller patches just one nested setting", async () => {
    state.settings.mockResolvedValue({
      ...seedContent.settings,
      email: "custom@example.com",
      company: {
        commercialName: "Aurora",
        legalName: "Aurora Ltda.",
        city: "Brasília, DF",
      },
      brand: { logoLight: "/img/custom.svg", logoDark: "/img/dark.svg" },
    });
    const result = await saveSettings({
      company: { city: "Goiânia, GO" },
      brand: { favicon: "/img/icon.png" },
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        email: "custom@example.com",
        company: {
          commercialName: "Aurora",
          legalName: "Aurora Ltda.",
          city: "Goiânia, GO",
        },
        brand: {
          logoLight: "/img/custom.svg",
          logoDark: "/img/dark.svg",
          favicon: "/img/icon.png",
        },
      },
    });
  });
  it("merges a stale form's edited leaves against the latest settings read on the server", async () => {
    const baseline = normalizeSettings(seedContent.settings);
    const local = normalizeSettings({
      ...baseline,
      company: { ...baseline.company, city: "Goiânia, GO" },
    });
    const latest = normalizeSettings({
      ...baseline,
      store: {
        ...baseline.store,
        freeShippingFromCents: 800000,
        preparationDays: 2,
      },
      brand: { ...baseline.brand, logoDark: "/img/new-logo.svg" },
    });
    state.settings.mockResolvedValue(latest);
    const result = await saveSettings(settingsChanges(baseline, local));
    expect(result).toMatchObject({
      ok: true,
      data: {
        company: { city: "Goiânia, GO" },
        store: { freeShippingFromCents: 800000, preparationDays: 2 },
        brand: { logoDark: "/img/new-logo.svg" },
      },
    });
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({ store: latest.store, brand: latest.brand }),
    );
  });
  it("blocks invalid input and unknown config properties without writing or logging", async () => {
    expect(
      (await saveSettings({ company: { mapsUrl: "javascript:alert(1)" } })).ok,
    ).toBe(false);
    expect(
      (await saveSettings({ RESEND_API_KEY: "should-never-be-saved" })).ok,
    ).toBe(false);
    expect(state.save).not.toHaveBeenCalled();
    expect(state.log).not.toHaveBeenCalled();
  });
  it("keeps the team's identity list administrator-only and exposes only boolean integration health", async () => {
    state.ctx.mockResolvedValueOnce({
      me: { id: "editor", role: "editor" },
      repo: { mode: "demo", settings: state.settings, users: state.users },
    });
    const result = await getSettings();
    expect(result).toMatchObject({
      ok: true,
      data: {
        users: [],
        canEdit: false,
        integrations: {
          demo: true,
          supabase: true,
          email: true,
          storage: false,
          payments: false,
          paymentsSimulated: true,
        },
      },
    });
    expect(state.users).not.toHaveBeenCalled();
  });
  it("requires both Turnstile keys and never returns their values", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "public-value");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(integrationStatus(false).turnstile).toBe(false);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-value");
    vi.stubEnv("EMAIL_INBOUND_DOMAIN", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-value");
    vi.stubEnv("RESEND_API_KEY", "api-value");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "webhook-value");
    const status = integrationStatus(false);
    expect(status.turnstile).toBe(true);
    expect(status.inboundEmail).toBe(true);
    expect(
      Object.values(status).every((value) => typeof value === "boolean"),
    ).toBe(true);
    expect(JSON.stringify(status)).not.toContain("secret-value");
  });
});
