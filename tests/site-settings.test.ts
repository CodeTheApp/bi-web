import { describe, expect, it } from "vitest";
import { createLoader, createSerializer } from "nuqs/server";
import {
  brandOf,
  companyOf,
  normalizeSettings,
  seedContent,
  settingsSchema,
  siteMetadata,
  settingsChanges,
  mergeSettings,
} from "@/entities/site-content";
import { settingsTabParser } from "@/_pages/admin-settings/model/tabs";

describe("site configuration compatibility and public branding", () => {
  it("reads the original settings JSON without dropping contacts, SEO or checkout defaults", () => {
    const old = { ...seedContent.settings };
    delete old.company;
    delete old.brand;
    delete old.store;
    const normalized = normalizeSettings(old);
    expect(normalized).toMatchObject(old);
    expect(normalized.company.commercialName).toBe("Brasília Iluminação");
    expect(normalized.company.city).toBe("Brasília, DF");
    expect(normalized.store).toMatchObject({
      deliveryEnabled: true,
      pickupEnabled: true,
      preparationDays: 0,
      freeShippingFromCents: 300000,
    });
    expect(brandOf(old)).toMatchObject({
      logoLight: "/img/logo-claro.svg",
      logoDark: "/img/logo-cor.svg",
      compactLight: "/img/logo-claro.svg",
      favicon: "/img/bi-escuro.svg",
      ogImage: "/img/hero.jpg",
    });
  });
  it("uses configured company and brand assets in effective public values and metadata", () => {
    const settings = normalizeSettings({
      ...seedContent.settings,
      company: {
        commercialName: "Estúdio Aurora",
        legalName: "Aurora Ltda.",
        city: "São Paulo, SP",
        serviceHours: "Segunda a sexta, 9h–18h",
        mapsUrl: "https://maps.google.com/?q=Aurora",
      },
      brand: {
        logoLight: "/media/logo-light.png",
        logoDark: "https://cdn.example.com/logo.svg",
        compactDark: "/media/symbol.svg",
        favicon: "/media/icon.png",
        ogImage: "https://cdn.example.com/social.jpg",
      },
    });
    expect(companyOf(settings).legalName).toBe("Aurora Ltda.");
    expect(brandOf(settings)).toMatchObject({
      logoLight: "/media/logo-light.png",
      compactLight: "/media/logo-light.png",
      compactDark: "/media/symbol.svg",
    });
    expect(siteMetadata(settings)).toMatchObject({
      title: { default: settings.seoTitle, template: "%s — Estúdio Aurora" },
      icons: { icon: "/media/icon.png" },
      openGraph: {
        siteName: "Estúdio Aurora",
        images: ["https://cdn.example.com/social.jpg"],
      },
    });
    expect(brandOf({ ...settings, brand: undefined }).favicon).toBe(
      "/img/bi-escuro.svg",
    );
  });
  it("saves only edited leaves and keeps another editor's newer store and brand values", () => {
    const baseline = normalizeSettings(seedContent.settings);
    const draft = normalizeSettings({
      ...baseline,
      company: { ...baseline.company, city: "Goiânia, GO" },
      store: { ...baseline.store, pickupAddress: "Rua Aurora, 20" },
    });
    const latest = normalizeSettings({
      ...baseline,
      brand: { ...baseline.brand, logoDark: "/img/new-logo.svg" },
      store: {
        ...baseline.store,
        freeShippingFromCents: 600000,
        preparationDays: 3,
      },
    });
    const patch = settingsChanges(baseline, draft);
    expect(patch).toEqual({
      company: { city: "Goiânia, GO" },
      store: { pickupAddress: "Rua Aurora, 20" },
    });
    const saved = mergeSettings(latest, patch);
    expect(saved.company.city).toBe("Goiânia, GO");
    expect(saved.brand.logoDark).toBe("/img/new-logo.svg");
    expect(saved.store).toMatchObject({
      pickupAddress: "Rua Aurora, 20",
      freeShippingFromCents: 600000,
      preparationDays: 3,
    });
    expect(settingsChanges(saved, saved)).toEqual({});
    expect(
      settingsChanges(saved, {
        ...saved,
        company: { ...saved.company, address: "", serviceHours: "" },
      }),
    ).toEqual({});
  });
  it("includes deliberate clearing, false toggles and zero values in an edit patch", () => {
    const baseline = normalizeSettings({
      ...seedContent.settings,
      company: { address: "Rua Aurora, 20" },
      store: { preparationDays: 3 },
    });
    const draft = normalizeSettings({
      ...baseline,
      company: { ...baseline.company, address: "" },
      store: {
        ...baseline.store,
        preparationDays: 0,
        expressEnabled: false,
        freeShippingFromCents: null,
      },
    });
    const patch = settingsChanges(baseline, draft);
    expect(patch).toEqual({
      company: { address: "" },
      store: {
        expressEnabled: false,
        preparationDays: 0,
        freeShippingFromCents: null,
      },
    });
    expect(mergeSettings(baseline, patch)).toEqual(draft);
  });
  it("rejects unsafe public URLs and inline social assets while accepting local demo logos", () => {
    const base = { ...seedContent.settings };
    for (const mapsUrl of [
      "javascript:alert(1)",
      "file:///private/config",
      "/relative-map",
      "https://",
    ])
      expect(
        settingsSchema.safeParse({ ...base, company: { mapsUrl } }).success,
      ).toBe(false);
    for (const logoDark of [
      "javascript:alert(1)",
      "//other.example.com/logo.svg",
      "data:text/html;base64,SGk=",
      "data:image/svg+xml;base64,PHN2Zy8+",
      "/\\evil.svg",
    ])
      expect(
        settingsSchema.safeParse({ ...base, brand: { logoDark } }).success,
      ).toBe(false);
    const inline = "data:image/png;base64,iVBORw0KGgo=";
    expect(
      settingsSchema.safeParse({ ...base, brand: { logoDark: inline } })
        .success,
    ).toBe(true);
    expect(
      settingsSchema.safeParse({ ...base, brand: { favicon: inline } }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({ ...base, brand: { ogImage: inline } }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...base,
        brand: { ogImage: inline.replace("data:", "DATA:") },
      }).success,
    ).toBe(false);
  });
  it("rejects invalid store operations instead of silently applying a more permissive fallback on save", () => {
    expect(
      settingsSchema.safeParse({
        ...seedContent.settings,
        store: { deliveryEnabled: false, pickupEnabled: false },
      }).success,
    ).toBe(false);
    expect(
      settingsSchema.safeParse({
        ...seedContent.settings,
        store: { preparationDays: -1 },
      }).success,
    ).toBe(false);
  });
  it("deep-links configuration tabs and preserves unrelated URL state", async () => {
    const load = createLoader({ aba: settingsTabParser });
    const serialize = createSerializer({ aba: settingsTabParser });
    expect(await load("?aba=marca")).toEqual({ aba: "marca" });
    expect(await load("?aba=unknown")).toEqual({ aba: "empresa" });
    expect(serialize("/admin/config?tema=dark", { aba: "integracoes" })).toBe(
      "/admin/config?tema=dark&aba=integracoes",
    );
  });
});
