export const DEMO_DATA_MODES = ["examples", "empty"] as const;
export type DemoDataMode = (typeof DEMO_DATA_MODES)[number];
export type DemoWorkspaceStatus = { mode: DemoDataMode; revision: number };
