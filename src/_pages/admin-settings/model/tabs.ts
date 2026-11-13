import { parseAsStringLiteral } from "nuqs/server";
export const SETTINGS_TABS = [
  ["empresa", "Empresa"],
  ["loja", "Loja"],
  ["marca", "Marca"],
  ["equipe", "Equipe"],
  ["integracoes", "Integrações"],
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number][0];
export const settingsTabParser = parseAsStringLiteral(
  SETTINGS_TABS.map(([key]) => key),
)
  .withDefault("empresa")
  .withOptions({ history: "replace", shallow: true });
