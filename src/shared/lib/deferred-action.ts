/** A pending action can be cancelled or committed once, even if its view unmounts. */
export class DeferredAction {
  status: "pending" | "cancelled" | "committed" = "pending";
  private result?: Promise<void>;
  constructor(private operation: () => void | Promise<void>) {}
  cancel() { if (this.status === "pending") this.status = "cancelled"; }
  commit(): Promise<void> {
    if (this.status === "cancelled") return Promise.resolve();
    if (this.result) return this.result;
    this.status = "committed";
    this.result = Promise.resolve().then(this.operation);
    return this.result;
  }
}
