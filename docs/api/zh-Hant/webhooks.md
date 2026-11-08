# 事件 Webhook

事件通知佇列、簽章寄送、端點管理與人工重試已接入，管理頁為 /dashboard/webhooks。本文件描述此協定；依賴前請先以自己的接收端測試。

## 事件與本文

支援 code.assigned、code.claimed、code.redeemed、code.revoked、order.delivered、order.refunded。事件與業務資料在同一交易提交，只有建立事件當下啟用、且商品與事件類型符合的端點會建立寄送工作；不追溯新訂閱之前的事件。

JSON 本文包含 version（1）、id、type、productId、createdAt（毫秒）和 data。data 包含對應 claimId/campaignId/codeId/userId/redemptionId/orderId，退款事件另有 refundedMinor、amountMinor、currency。匿名 userId 為 null。沒有原始碼、Email、IP、問卷答案或付款憑證。

直接指派事件 code.assigned 的 data 為 assignmentId、codeId、userId，詳見 [管理員直接指派](assignments.md)。不提供管理員內部備註。

## 簽章

HTTP 標頭：

- Keydrop-Event-Id：事件 ID，重試保持不變。
- Keydrop-Signature：`t=<Unix 秒>,v1=<HMAC-SHA256 十六進位>`。

簽章訊息是 UTF-8 的 `時間戳.原始 JSON 本文`。密鑰為 32-byte 隨機值，以 64 位十六進位保存；HMAC 使用解碼後的 bytes，不是十六進位文字。密鑰放部署環境 WEBHOOK_SECRETS 的 JSON 物件，鍵名如 PARTNER，值為密鑰。資料庫只保存名稱，不保存密鑰。

收件端須先驗證原始本文簽章，再解析 JSON；勿重新 JSON.stringify 後驗證。建議允許五分鐘時鐘誤差，以 timing-safe comparison 比對，核對本文 id 與事件標頭一致，再用事件 id 做冪等處理。每次投遞重新簽署當下時間，事件 createdAt 不變；驗證新時間戳不能取代事件去重。

## 投遞語意

每五分鐘排程處理最多 20 筆到期投遞。僅 2xx 視為成功；DNS、網路、逾時及其他 HTTP 狀態都算失敗。每次上限五秒（含 DNS），不跟隨轉址、不讀取或保存回應本文。HTTP 狀態可保留，錯誤文字不保存。

失敗後依次等待約 2、4、8、16、32、64、128 分鐘，受五分鐘排程間隔影響；第八次失敗轉 failed，停止自動重試。程序中斷的 sending 工作在 60 秒租約過期後可接手。投遞是至少一次，可能重複或順序不同，接收端應先可靠入列再回 2xx。

端點限 HTTPS、公網 DNS、443 埠，不允許 URL 帳密、query、fragment、IP literal；每次寄送重查 DNS 並拒絕任一非公網結果。DNS 預檢不等於連線 IP 綁定，端點仍必須由可信任的部署管理員設定；Worker 保留 global_fetch_strictly_public。不要用不受信任使用者輸入建立端點。

此機制是事件通知。外部產品實際發放權益的同步兌換流程另行處理，不能把通知投遞成功當成權益已發放，也不會因通知失敗回滾既有領碼或付款交易。

## 管理員 API

這些端點只接受管理員 session，寫入必須有符合 APP_URL 的 Origin；不是一般 API token 操作。

- POST /api/webhooks：name、url、secretName、events（上述事件陣列）、productIds（明確 null 表示全部商品，否則非空商品 UUID 陣列）。建立後預設停用。
- PATCH /api/webhooks：`{action:"enabled",endpointId,enabled:true|false}`。啟用時必須已設定對應 WEBHOOK_SECRETS；停用不依賴密鑰。已在進行的 HTTP 請求可能完成，停用不等於能撤回對方已收到的資料。
- GET /api/webhooks：端點設定與啟用狀態；僅回傳密鑰名稱，不含密鑰值。
- GET /api/webhooks?endpointId=UUID&page=1：每頁 20 筆投遞狀態、事件種類、HTTP 狀態、下次嘗試、當輪次數、累積次數和人工重試次數；不回傳原始事件本文。
- PATCH /api/webhooks：`{action:"retry",endpointId,deliveryId}`。僅失敗且端點已啟用的工作可回到 pending，沿用原事件 ID；由下一輪排程處理。當輪嘗試歸零，累積次數與人工重試次數保留。pending、sending、delivered 不接受人工重試。

端點網址、密鑰名稱、商品與事件訂閱範圍建立後固定。改目的地時先停用舊端點、另建並啟用新端點；新端點只接收啟用後的新事件。重新啟用舊端點會恢復它尚未完成的工作，不會收到停用期間的事件。密鑰輪替可在環境變數更新同一名稱的值，收件端需協調輪替期間的驗證。

## 密鑰名稱與手動發放

- `secretName` 必須符合 `^[A-Z][A-Z0-9_]{0,63}$`，`WEBHOOK_SECRETS` JSON 中對應的值必須是 64 個十六進位字元（32 bytes）。
- 在[手動發放](handouts.md)頁取用的碼會標為已指派，但不會發出 `code.assigned` 或任何其他 Webhook 事件。
