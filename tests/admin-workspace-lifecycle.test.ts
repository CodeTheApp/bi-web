import { afterEach, expect, it, vi } from "vitest";
afterEach(() => vi.unstubAllGlobals());

it("notifies autosave owners synchronously before displaying the workspace dialog and remembers the blocked state", async () => {
  const browser = new EventTarget();
  vi.stubGlobal("window", browser);
  const { announceAdminWorkspaceChange, onAdminWorkspaceChange } =
    await import("@/shared/lib/admin-workspace-lifecycle");
  const cancel = vi.fn();
  const stop = onAdminWorkspaceChange(cancel);
  expect(cancel).not.toHaveBeenCalled();
  announceAdminWorkspaceChange();
  expect(cancel).toHaveBeenCalledOnce();
  stop();
  announceAdminWorkspaceChange();
  expect(cancel).toHaveBeenCalledOnce();
  const lateEditor = vi.fn();
  const remove = onAdminWorkspaceChange(lateEditor);
  expect(lateEditor).toHaveBeenCalledOnce();
  remove();
});
