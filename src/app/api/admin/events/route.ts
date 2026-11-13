import { ctx } from "@/server/admin/guard";
import { demoAllowed } from "@/server/admin/repo";
import { getDemoDataMode } from "@/server/demo-workspace";
import { createAdminEventStream } from "@/server/admin-events/stream";

export const runtime = "nodejs";

/** Demo-only stream. Supabase installations keep authentication and native RLS. */
export async function GET(request: Request) {
  if (!demoAllowed()) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  try {
    const { repo, me } = await ctx();
    if (repo.mode !== "demo" || !me || !["admin", "editor"].includes(me.role))
      return new Response(null, { status: 403 });
  } catch {
    return new Response(null, { status: 401 });
  }
  return new Response(
    createAdminEventStream(
      request.signal,
      getDemoDataMode(),
      request.headers.get("last-event-id"),
    ),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    },
  );
}
