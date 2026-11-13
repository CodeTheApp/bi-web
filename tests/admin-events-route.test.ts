import { beforeEach, describe, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({
  allowed: true,
  ctx: vi.fn(),
  stream: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/admin/repo", () => ({ demoAllowed: () => deps.allowed }));
vi.mock("@/server/admin/guard", () => ({ ctx: deps.ctx }));
vi.mock("@/server/demo-workspace", () => ({ getDemoDataMode: () => "empty" }));
vi.mock("@/server/admin-events/stream", () => ({
  createAdminEventStream: deps.stream,
}));
import { GET } from "@/app/api/admin/events/route";

beforeEach(() => {
  deps.allowed = true;
  deps.ctx
    .mockReset()
    .mockResolvedValue({
      repo: { mode: "demo" },
      me: { id: "u1", role: "admin" },
    });
  deps.stream.mockReset().mockImplementation(
    () =>
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
  );
});
const request = (headers?: HeadersInit) =>
  new Request("http://localhost:3000/api/admin/events", { headers });
describe("demo event stream access", () => {
  it("requires a valid staff context and never creates an unauthenticated stream", async () => {
    deps.ctx.mockRejectedValue(new Error("expired"));
    expect((await GET(request())).status).toBe(401);
    expect(deps.stream).not.toHaveBeenCalled();
    deps.ctx.mockResolvedValue({
      repo: { mode: "demo" },
      me: { role: "customer" },
    });
    expect((await GET(request())).status).toBe(403);
  });
  it("does not expose demo transport in Supabase or disabled deployments", async () => {
    deps.allowed = false;
    expect((await GET(request())).status).toBe(404);
    expect(deps.ctx).not.toHaveBeenCalled();
    expect(deps.stream).not.toHaveBeenCalled();
  });
  it("refuses cross-origin stream requests", async () => {
    expect(
      (await GET(request({ origin: "https://other.example" }))).status,
    ).toBe(403);
    expect(deps.stream).not.toHaveBeenCalled();
  });
  it("allows editors, captures workspace and resumes by Last-Event-ID with private response headers", async () => {
    deps.ctx.mockResolvedValue({
      repo: { mode: "demo" },
      me: { id: "u2", role: "editor" },
    });
    const input = request({ "last-event-id": "process:8" });
    const response = await GET(input);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(deps.stream).toHaveBeenCalledWith(
      input.signal,
      "empty",
      "process:8",
    );
  });
});
