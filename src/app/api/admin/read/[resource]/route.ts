import { readAdminResource } from "@/server/admin/read";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};

/** Private reads are independent GET requests, outside the Server Action queue. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ resource: string }> },
) {
  const { resource } = await params;
  const url = new URL(request.url);
  const raw = url.searchParams.get("args");
  let args: unknown = [];
  if (
    [...url.searchParams.keys()].some((key) => key !== "args") ||
    url.searchParams.getAll("args").length > 1 ||
    (raw?.length ?? 0) > 4096
  )
    args = null;
  else if (raw !== null) {
    try {
      args = JSON.parse(raw);
    } catch {
      args = null;
    }
  }
  const response = await readAdminResource(resource, args);
  return Response.json(response.result, { status: response.status, headers });
}
