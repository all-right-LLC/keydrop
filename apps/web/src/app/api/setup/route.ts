import { runtime } from "@/lib/server/env";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initialize, setupInput, SetupError } from "@/lib/server/bootstrap";
import { reportInstallation, telemetryEnabled } from "@/lib/server/telemetry";
import { KEYDROP_VERSION } from "@/config/version";

export async function POST(request: Request) {
  const { env, settings } = await runtime();
  if (request.headers.get("origin") !== settings.APP_URL) return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({ error: "INVALID_INPUT" }, { status: 415 });
  const text = await request.text();
  if (text.length > 4096) return Response.json({ error: "INVALID_INPUT" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(text); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400 }); }
  const input = setupInput.safeParse(body);
  if (!input.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  try {
    await initialize(env.DB, settings, input.data);
    // 匿名安裝回報只在這裡送一次，不拖慢回應；失敗由排程補送。
    const report = reportInstallation(env.DB, { enabled: telemetryEnabled(env.KEYDROP_TELEMETRY), version: KEYDROP_VERSION }).catch(() => undefined);
    try { (await getCloudflareContext({ async: true })).ctx.waitUntil(report); } catch { await report; }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof SetupError) return Response.json({ error: error.code }, { status: error.code === "INVALID_SECRET" ? 403 : 409 });
    return Response.json({ error: "SETUP_FAILED" }, { status: 500 });
  }
}
