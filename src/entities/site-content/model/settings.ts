import {
  brandSettingsSchema,
  companySettingsSchema,
  settingsSchema,
  type Settings,
} from "./schema";
import { normalizeStorePreferences } from "@/entities/store-settings";
import { z } from "zod";

/** Old JSON settings remain readable; blank brand overrides always preserve the original artwork. */
export function normalizeSettings(input: unknown) {
  const settings = settingsSchema.parse(input);
  return {
    ...settings,
    company: companySettingsSchema.parse(settings.company ?? {}),
    brand: brandSettingsSchema.parse(settings.brand ?? {}),
    store: normalizeStorePreferences(settings.store),
  };
}

/** Validate after merging: Zod defaults in a partial schema must not reset omitted saved values. */
export function mergeSettings(current: Settings, input: unknown) {
  const patch = z.record(z.string(), z.unknown()).parse(input);
  const group = (key: "company" | "brand" | "store") =>
    patch[key] === undefined
      ? current[key]
      : {
          ...current[key],
          ...z.record(z.string(), z.unknown()).parse(patch[key]),
        };
  return normalizeSettings(
    settingsSchema.strict().parse({
      ...current,
      ...patch,
      company: group("company"),
      brand: group("brand"),
      store: group("store"),
    }),
  );
}

export type SettingsPatch = Partial<
  Omit<Settings, "company" | "brand" | "store">
> & {
  company?: Partial<NonNullable<Settings["company"]>>;
  brand?: Partial<NonNullable<Settings["brand"]>>;
  store?: Partial<NonNullable<Settings["store"]>>;
};

/** Send only edited leaves, so a stale open form cannot revert another editor's unrelated updates. */
export function settingsChanges(
  baseline: Settings,
  draft: Settings,
): SettingsPatch {
  const previous = normalizeSettings(baseline);
  const next = normalizeSettings(draft);
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(next) as Array<keyof typeof next>) {
    const value = next[key];
    if (typeof value !== "object" || value === null) {
      if (!Object.is(previous[key], value)) patch[key] = value;
      continue;
    }
    const saved = previous[key] as Record<string, unknown>;
    const leaves = Object.fromEntries(
      Object.entries(value).filter(
        ([name, item]) => !Object.is(saved[name], item),
      ),
    );
    if (Object.keys(leaves).length) patch[key] = leaves;
  }
  return patch as SettingsPatch;
}
export function companyOf(settings: Settings) {
  return companySettingsSchema.parse(settings.company ?? {});
}
export function brandOf(settings: Settings) {
  const brand = brandSettingsSchema.parse(settings.brand ?? {});
  return {
    logoLight: brand.logoLight || "/img/logo-claro.svg",
    logoDark: brand.logoDark || "/img/logo-cor.svg",
    compactLight:
      brand.compactLight || brand.logoLight || "/img/logo-claro.svg",
    compactDark: brand.compactDark || brand.logoDark || "/img/logo-cor.svg",
    symbolLight: brand.compactLight || "/img/bi-claro.svg",
    favicon: brand.favicon || "/img/bi-escuro.svg",
    ogImage: brand.ogImage || "/img/hero.jpg",
  };
}
