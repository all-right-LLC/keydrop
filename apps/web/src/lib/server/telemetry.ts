// 匿名安裝回報：完成 /setup 後送出一次隨機實例 ID 和版本號到 Keydrop 專案網站，
// 只用來統計有多少站點使用 Keydrop。不送網址、Email、碼、訂單或任何業務資料。
// 成功一次之後就不再送；當下送不出去時，由排程工作補送（每小時最多一次），直到成功為止。
// 預設開啟；把 KEYDROP_TELEMETRY 設成 off 即可關閉。說明見 docs/api/<語言>/deployment.md。

export const TELEMETRY_URL = "https://keydrop.allright.dev/api/telemetry";
const RETRY_AFTER = 60 * 60 * 1000;

export function telemetryEnabled(value: string | undefined) {
  return !/^(0|off|false|no|disabled?)$/i.test((value ?? "").trim());
}

export type TelemetryPayload = { id: string; version: string };
type Row = { instance_id: string; last_sent_at: number | null; last_attempt_at: number | null };

export async function reportInstallation(db: D1Database, options: {
  enabled: boolean;
  version: string;
  now?: number;
  send?: (payload: TelemetryPayload) => Promise<boolean>;
}) {
  if (!options.enabled) return "disabled" as const;
  // 只統計完成初始化的站點，部署失敗或沒人用的實例不算。
  if (!await db.prepare("SELECT id FROM installation WHERE id = 1").first()) return "not-installed" as const;
  const now = options.now ?? Date.now();
  await db.prepare("INSERT OR IGNORE INTO telemetry_state (id, instance_id) VALUES (1, ?)").bind(crypto.randomUUID()).run();
  const row = await db.prepare("SELECT instance_id, last_sent_at, last_attempt_at FROM telemetry_state WHERE id = 1").first<Row>();
  if (!row || row.last_sent_at) return "skipped" as const;
  if (row.last_attempt_at && now - row.last_attempt_at < RETRY_AFTER) return "skipped" as const;
  // 先記下嘗試時間（條件更新），同時觸發的請求或排程只有一個會真的送出。
  const claimed = await db.prepare("UPDATE telemetry_state SET last_attempt_at = ? WHERE id = 1 AND last_sent_at IS NULL AND (last_attempt_at IS NULL OR last_attempt_at = ?)")
    .bind(now, row.last_attempt_at).run();
  if (!claimed.meta.changes) return "skipped" as const;
  let ok = false;
  try {
    ok = await (options.send ?? sendTelemetry)({ id: row.instance_id, version: options.version });
  } catch {
    ok = false;
  }
  if (ok) await db.prepare("UPDATE telemetry_state SET last_sent_at = ? WHERE id = 1").bind(now).run();
  return ok ? "sent" as const : "failed" as const;
}

async function sendTelemetry(payload: TelemetryPayload) {
  // 以 globalThis 呼叫原生 fetch，避免 Workers 的接收者錯誤。
  const response = await globalThis.fetch(TELEMETRY_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": `Keydrop/${payload.version}` },
    body: JSON.stringify(payload),
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
  return response.ok;
}
