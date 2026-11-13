/** Shared browser lifecycle, independent of any feature or persistence implementation. */
export const ADMIN_WORKSPACE_CHANGED_EVENT = "admin:workspace-changed";
let changed = false;

export function announceAdminWorkspaceChange() {
  changed = true;
  window.dispatchEvent(new Event(ADMIN_WORKSPACE_CHANGED_EVENT));
}

export function onAdminWorkspaceChange(listener: () => void) {
  if (changed) listener();
  window.addEventListener(ADMIN_WORKSPACE_CHANGED_EVENT, listener);
  return () =>
    window.removeEventListener(ADMIN_WORKSPACE_CHANGED_EVENT, listener);
}
