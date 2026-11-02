import { upgradeWebSocket } from "@vercel/functions";
import { getRealtimeHub } from "@/lib/realtime/hub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Connections close at the function's max duration; clients reconnect.
export const maxDuration = 300;

export async function GET(request: Request) {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    // Health check: whether cross-instance delivery (Redis) is working. No secrets.
    const redis = await getRealtimeHub().redisStatus();
    return Response.json({ ok: true, service: "mindfuel-realtime", redis }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    return await upgradeWebSocket((ws) => getRealtimeHub().attach(ws), { maxPayload: 64 * 1024 });
  } catch (error) {
    // Outside Vercel (next dev / next start) the custom server handles upgrades.
    console.error("WebSocket upgrade unavailable", error);
    return new Response("WebSocket upgrades are not available here", { status: 426 });
  }
}
