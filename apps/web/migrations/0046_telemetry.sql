-- 匿名安裝回報的狀態：隨機實例 ID 與送出時間，不含網址、帳號或任何業務資料。
CREATE TABLE telemetry_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  instance_id TEXT NOT NULL,
  last_sent_at INTEGER,
  last_attempt_at INTEGER
);
