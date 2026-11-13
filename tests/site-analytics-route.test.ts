import { beforeEach, describe, expect, it, vi } from "vitest";
const record = vi.hoisted(() => vi.fn());
vi.mock("@/server/analytics/repo", () => ({ recordEvent: record }));
import { POST } from "@/app/api/analytics/route";
const event = { id: "89a0e285-7cf5-4c36-91c5-85f0b95a301a", session: "ff6a7fe1-40de-4aee-9bfc-f6de715d28a8", event: "page_view", path: "/loja" };
const request = (data: unknown, origin = "https://site.test") => new Request("https://site.test/api/analytics", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(data) });
describe("site analytics collector", () => {
  beforeEach(() => { record.mockReset(); record.mockResolvedValue(undefined); });
  it("accepts only validated same-origin observations", async () => { expect((await POST(request(event, "https://another.test"))).status).toBe(403); expect((await POST(request({ ...event, email: "private@example.com" }))).status).toBe(400); expect(record).not.toHaveBeenCalled(); expect((await POST(request(event))).status).toBe(202); expect(record).toHaveBeenCalledOnce(); });
  it("rejects oversized and corrupt payloads and exposes collector failure without a purchase side effect", async () => { expect((await POST(request({ ...event, extra: "x".repeat(3000) }))).status).toBe(413); record.mockRejectedValueOnce(new Error("database unavailable")); expect((await POST(request(event))).status).toBe(503); });
});

it("returns 400 for malformed JSON and never forwards it to storage", async () => {
  record.mockClear();
  const malformed = new Request("https://site.test/api/analytics", { method: "POST", headers: { origin: "https://site.test", "Content-Type": "application/json" }, body: "{" });
  expect((await POST(malformed)).status).toBe(400);
  expect(record).not.toHaveBeenCalled();
});

it("cancels an oversized streamed body before buffering the complete request", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ pull(controller) { controller.enqueue(new Uint8Array(4096)); }, cancel() { cancelled = true; } });
  const input = new Request("https://site.test/api/analytics", { method: "POST", headers: { origin: "https://site.test" }, body: stream, duplex: "half" } as RequestInit & { duplex: "half" });
  expect((await POST(input)).status).toBe(413);
  expect(cancelled).toBe(true);
});
