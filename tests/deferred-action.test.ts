import { describe, expect, it, vi } from "vitest";
import { DeferredAction } from "@/shared/lib/deferred-action";
describe("deferred admin actions", () => {
  it("undo before the deadline cancels the actual operation", async () => { const operation = vi.fn(); const action = new DeferredAction(operation); action.cancel(); await action.commit(); expect(operation).not.toHaveBeenCalled(); });
  it("timer completion and unmount can only commit the captured operation once", async () => { const operation = vi.fn().mockResolvedValue(undefined); const action = new DeferredAction(operation); await Promise.all([action.commit(), action.commit()]); expect(operation).toHaveBeenCalledTimes(1); });
  it("surfaces a failed server operation without replaying it", async () => { const operation = vi.fn().mockRejectedValue(new Error("offline")); const action = new DeferredAction(operation); await expect(action.commit()).rejects.toThrow("offline"); await expect(action.commit()).rejects.toThrow("offline"); expect(operation).toHaveBeenCalledTimes(1); });
});
