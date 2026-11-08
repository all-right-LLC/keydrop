# 外部權益發放協定

兌換碼時，Keydrop 可以透過 HTTPS 端點或程式 hook，在你自己的產品發放權益。權益設定在後台；可透過登入 session、REST 及 MCP 兌換，每次操作都會留下紀錄，結果不明時可在控制台核對。

## 整合註冊

部署者在 `apps/web/src/custom/external-rewards.ts` 註冊自己控制的 HTTPS 端點或程式 hook。同一 ID 不可同時出現在兩種註冊表；業務設定只引用整合 ID，不能提交任意網址。HTTP 端點需 secretName，部署者把對應的 32-byte hex HMAC 密鑰存進 `EXTERNAL_REWARD_SECRETS` secret，密鑰不進資料庫或版本庫。

送出的 JSON：

```json
{
  "version": 1,
  "operationId": "固定操作 UUID",
  "productId": "商品 UUID",
  "codeId": "碼 UUID",
  "userId": "Keydrop 帳號 ID",
  "reward": {"payload": {"plan": "pro", "duration": {"days": 30}}, "repeat": "add", "reclaimOnRevoke": true}
}
```

不包含原始碼、Email、裝置 ID 或使用者任意提供的網址。reward 可用巢狀 JSON，整個請求上限 16 KiB。

標頭：

- `Idempotency-Key`：operationId。
- `Keydrop-Signature`：`t=Unix秒,v1=HMAC-SHA256(timestamp.rawBody)`，使用 32-byte hex 密鑰解碼後簽署，驗證方式同 Webhook 文件。
- `Content-Type`／`Accept`：application/json。

接收端須驗簽、檢查合理時間差，並把 operationId 與發放結果持久化。相同 operationId 和本文的重試必須回傳原結果，不得再次發放；相同 ID 搭配不同本文必須拒絕。不能只把重複檢查放在記憶體。

## 回應

HTTP 2xx、application/json，本文最多 4 KiB：

```json
{"operationId":"與請求相同的 UUID","status":"applied"}
```

`applied` 表示權益已持久化完成。只有匹配操作 ID 的有效收據可確認成功。明確拒絕且未產生副作用時回傳 `status: "rejected"`；不得在已發放但收據暫時無法讀取時回 rejected。其他狀態、額外欄位、錯誤 ID、非 2xx 或無效 JSON 都視為結果未確認，不把回應本文直接呈現給使用者。

## 逾時與重試

五秒期限包含 DNS、HTTP、本文讀取及程式 hook。HTTP 使用 AbortSignal、不跟隨轉址，本文超限即取消；原始例外與外部本文不寫入對使用者的錯誤。

3xx 回覆一律判為無效收據；Keydrop 不會跟隨轉址到其他主機。

呼叫層不自行重試。兌換服務先持久化 operationId 和權益快照；同一帳號與碼即使重新整理、改用新的請求冪等鍵，也沿用同一外部識別與內容。每個請求鍵都保留對應關係，不能改用於其他碼。逾時不代表對方沒有發放；晚到成功或程序中斷必須透過同一 ID 查回結果，不能另發一筆。

程式 hook 接收相同欄位及 signal，回傳同樣的收據。hook 也必須實作持久化冪等並遵守取消；Promise 逾時無法強制終止部署者自行撰寫的程式。

目前沿用 HTTPS 443、公網 DNS 預檢；拒絕 IP、內網／特殊網址與混合公私網解析。DNS 預檢未把 fetch 固定到已檢查的 IP，部署者只應註冊自己控制的服務。這個同步發放協定與會自動重試的事件 Webhook 不同。

## 配置與交易行為

- `EXTERNAL_REWARD_SECRETS` 為 secretName → 64 字元 hex 密鑰的 JSON secret map。只存在部署環境或公司 keys/，不可放進 reward payload。
- 後台活動權益選 Connected product reward，指定已註冊 integrationId 與 JSON payload（最多 8 KiB）。API reward 格式為 `{kind:"external",integrationId:"partner",payload:{plan:"pro"},repeat:"add",reclaimOnRevoke:true}`。
- 操作以 60 秒租約防止同時重送，租約到期後轉人工確認，使用者不能接手；沒有自動補發排程。每次發送仍有五秒期限。
- 失敗不新增 redemptions、不增加 use_count。只有匹配 operationId 的 rejected 收據允許自行重試，而且明確拒絕會釋放兌換名額（use_count／max_uses），其他人可以兌換同一碼；原使用者之後重試時若名額已用完會回 `REDEMPTION_UNAVAILABLE`、不再呼叫接收端。獨立碼仍不放回庫存重新領取或出售；逾時、無效回覆、程序中斷及本地提交失敗均設定 review_required，禁止使用者重送；控制台首頁顯示操作 ID 與累積失敗次數。成功後原子寫入兌換、消耗一次名額並解決該失敗通知。
- 未確認操作的名額保留給原帳號，避免對方其實已發放後再把名額交給另一人。獨立碼在此期間不重新分發或出售。這是未兌換操作保留，不是已兌換；結果不明時只能由管理員在外部結果確認頁核對，不能因換請求鍵或重新整理繞過。若已發放但本地碼已撤銷或過期，仍需管理員在外部產品安排補償。
- 在途操作保存原權益快照；後台修改規則不會讓重試變成另一筆權益。重試及完成時仍檢查撤銷、期限、持有關係與容量。
- 外部已回 applied，但本地因撤銷或資料庫失敗未能提交時，仍保留相同操作並通知管理員。接收端必須支援同 ID 查回既有結果，不能以重送新增權益。
- `repeat` 的累加／覆蓋／拒絕語意由外部產品在同一發放交易內實現；Keydrop 不虛構外部額度帳本。
- 已完成外部權益若被撤銷且 reclaimOnRevoke 開啟，會同交易建立外部撤銷工作與管理員通知。排程送出撤銷，只有接收端確認完成才解決通知；本地碼撤銷不等於外部回收已完成。

## 外部撤銷

撤銷請求使用相同整合及原權益快照，額外包含：

```json
{"action":"revoke","originalOperationId":"原發放操作 UUID","operationId":"不同於發放、固定的撤銷 UUID"}
```

其餘 productId、codeId、userId、reward、version 及簽章格式不變。沒有 action 的既有請求仍表示發放，避免改變在途發放的本文。action 與 originalOperationId 必須一起出現，撤銷 operationId 不能與原發放 ID 相同。

接收端必須按 originalOperationId 找到原權益來源，只回收該來源依策略可回收的部分，不得撤銷同帳號的所有權益或另一買家的權益。回傳匹配撤銷 operationId 的 applied 才表示已處理完成；HTTP 2xx 本身不夠。接收端應保留已消耗部分的交易紀錄，無法處理的部分不得冒稱已回收。

排程每次最多 10 筆，60 秒租約與結果 fencing；失敗依 5、10、20、40 分鐘退避，第五次失敗停止自動嘗試。這是撤銷工作重試，不會自動重試使用者的失敗兌換。逾時及人工重試都沿用相同撤銷 ID。

管理員可在 `/dashboard/external-revocations` 查看每頁 25 筆工作與累積嘗試次數。只有 failed 工作可人工重試，已確認成功不重送。`POST /api/admin/external-revocations` 接受 `{redemptionId:"原發放 UUID"}`，需要管理員 session 與 Origin；重設本輪計數但保留 total_attempts／retry_count。原規則即使已修改，撤銷仍使用發放當時快照。

## 管理員確認未知發放結果

`/dashboard/external-reviews` 列出待確認操作。管理員先以原 operationId 查詢接收端紀錄，再填寫至少 10 字的核對說明（不可含密鑰或原始碼），選擇：

- `applied`：已確認外部發放，原子完成本地兌換；不再呼叫接收端。
- `not_applied`：已確認沒有發放，重新允許原使用者重試；保留原操作 ID 與權益快照，釋放兌換名額（同明確拒絕），不自動發放。

`POST /api/admin/external-reviews` 接受 `{attemptId, outcome, note}`，需要管理員 session 與同源 Origin。操作及核對紀錄同交易寫入，重複處理拒絕；成功後解決通知。碼在核對期間已撤銷、過期或商品封存時，確認 applied 仍會記錄這筆兌換（外部確實已發放，本地必須留紀錄才能追蹤回收）；碼維持原狀態。若碼已撤銷或來源訂單已撤權，兌換會立即標為撤銷，`reclaimOnRevoke` 開啟時自動排入外部撤銷。

排程會將超過 60 秒租約的在途發放隔離為人工確認，不需要等待使用者再試。舊版未區分結果的 retryable 操作，遷移後全部保守轉人工確認。


管理員通知中心位於 `/dashboard/notifications`，區分明確拒絕與結果不明。前者可由使用者重試；後者保留名額並禁止使用者重試，必須依上述人工核對流程處理。通知信為可選配，寄送規則見 [郵件文件](email.md)；寄信重試只重送提醒，絕不重新發放權益。
