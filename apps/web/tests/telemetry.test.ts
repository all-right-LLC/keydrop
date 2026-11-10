import { describe, expect, it } from "vitest";
import { testDatabase } from "./d1";
import { reportInstallation, telemetryEnabled, type TelemetryPayload } from "../src/lib/server/telemetry";

const DAY = 24 * 60 * 60 * 1000;

function setup(installed = true) {
  const { db, sqlite } = testDatabase();
  if (installed) sqlite.prepare("INSERT INTO installation(id,admin_user_id,created_at) VALUES(1,?,0)").run("admin");
  const sent: TelemetryPayload[] = [];
  let ok = true;
  const send = async (payload: TelemetryPayload) => { sent.push(payload); return ok; };
  return { db, sent, send, fail: (value: boolean) => { ok = !value; } };
}

describe("匿名安裝回報", () => {
  it("預設開啟，只有明確關閉的值才停用", () => {
    for (const value of [undefined, "", "on", "1", "true"]) expect(telemetryEnabled(value)).toBe(true);
    for (const value of ["off", "OFF", "0", "false", "no", "disable", "disabled", " off "]) expect(telemetryEnabled(value)).toBe(false);
  });

  it("關閉或尚未初始化時不送", async () => {
    const a = setup();
    expect(await reportInstallation(a.db, { enabled: false, version: "1", send: a.send })).toBe("disabled");
    const b = setup(false);
    expect(await reportInstallation(b.db, { enabled: true, version: "1", send: b.send })).toBe("not-installed");
    expect([...a.sent, ...b.sent]).toEqual([]);
  });

  it("只送隨機 ID 與版本，成功一次後不再送", async () => {
    const { db, sent, send } = setup();
    expect(await reportInstallation(db, { enabled: true, version: "0.1.0", now: 1_000, send })).toBe("sent");
    expect(await reportInstallation(db, { enabled: true, version: "0.1.0", now: 1_000 + 7 * DAY, send })).toBe("skipped");
    expect(await reportInstallation(db, { enabled: true, version: "0.2.0", now: 1_000 + 400 * DAY, send })).toBe("skipped");
    expect(sent).toHaveLength(1);
    expect(Object.keys(sent[0]).sort()).toEqual(["id", "version"]);
    expect(sent[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("失敗時一小時後補送，例外不外拋", async () => {
    const { db, sent, send, fail } = setup();
    fail(true);
    expect(await reportInstallation(db, { enabled: true, version: "1", now: DAY, send })).toBe("failed");
    expect(await reportInstallation(db, { enabled: true, version: "1", now: DAY + 10 * 60 * 1000, send })).toBe("skipped");
    fail(false);
    expect(await reportInstallation(db, { enabled: true, version: "1", now: DAY + 61 * 60 * 1000, send })).toBe("sent");
    expect(await reportInstallation(db, { enabled: true, version: "1", now: 3 * DAY, send })).toBe("skipped");
    expect(sent).toHaveLength(2);
    expect(sent[1].id).toBe(sent[0].id);
    const throwing = setup();
    expect(await reportInstallation(throwing.db, { enabled: true, version: "1", send: async () => { throw new Error("network"); } })).toBe("failed");
  });
});
