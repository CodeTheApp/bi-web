import "server-only";
import { DEMO_DATA_MODES, type DemoDataMode, type DemoWorkspaceStatus } from "@/shared/model/demo-workspace";
import { demoAllowed } from "@/server/admin/repo";
import { publishAdminEvent } from "@/server/admin-events/event-bus";

export type { DemoDataMode, DemoWorkspaceStatus } from "@/shared/model/demo-workspace";

const memory = globalThis as typeof globalThis & { __biDemoWorkspace?: DemoWorkspaceStatus };
const state = () => memory.__biDemoWorkspace ??= { mode: "examples", revision: 0 };

/** Process-local selection shared by all demo repositories. Capture it before awaiting work. */
export const getDemoDataMode = (): DemoDataMode => state().mode;
export const getDemoWorkspaceStatus = (): DemoWorkspaceStatus => ({ ...state() });
export const demoWorkspaceKey = (namespace: string, mode: DemoDataMode = getDemoDataMode()) => `${namespace}:${mode}`;

/** Only a guarded Server Action may expose this mutation to the browser. Never affects Supabase. */
export function setDemoDataMode(mode: DemoDataMode): DemoWorkspaceStatus {
  if (!demoAllowed()) throw new Error("A troca de dados está disponível apenas no modo demonstração.");
  if (!DEMO_DATA_MODES.includes(mode)) throw new Error("Escolha um ambiente de demonstração válido.");
  const current = state();
  if (current.mode !== mode) {
    current.mode = mode;
    current.revision++;
    publishAdminEvent(["workspace"], mode);
  }
  return { ...current };
}
