import { siteEventSchema } from "@/entities/site-analytics";
import { recordEvent } from "@/server/analytics/repo";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return new Response(null, { status: 413 });
  try {
    if (!request.body) return new Response(null, { status: 400 });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2048) { await reader.cancel(); return new Response(null, { status: 413 }); }
      chunks.push(chunk.value);
    }
    const raw = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
    const text = new TextDecoder().decode(raw);
    let body: unknown;
    try { body = JSON.parse(text); } catch { return new Response(null, { status: 400 }); }
    const input = siteEventSchema.safeParse(body);
    if (!input.success) return new Response(null, { status: 400 });
    await recordEvent(input.data);
    return new Response(null, { status: 202 });
  } catch { return new Response(null, { status: 503 }); }
}
