# MCP 整合

直接指派提供 `assign_code`（codes:issue 及 MCP 寫入開關）與 `list_code_assignments`（codes:read）；均限制商品範圍。詳見[直接指派協定](assignments.md)。歷史包含收件 Email 與內部備註，應保密。

端點：`https://<部署網域>/mcp`。使用官方 MCP TypeScript SDK 的無狀態 Streamable HTTP，POST 回傳 JSON；不提供常駐 GET SSE。每次請求都重新驗證權杖，因此不會沿用已撤銷的 session 授權。

## 設定

1. 管理員在 `/dashboard/tokens` 建立權杖，選擇商品及需要的權限。
2. 客戶端設定 MCP URL 與 HTTP 標頭 `Authorization: Bearer <token>`。
3. 預設僅有唯讀工具。若確實需要代理寫入，建立權杖時同時勾選對應的寫入 scope 與「Allow these write permissions through MCP」。僅有其中一個不會授予 MCP 寫入能力。

MCP 寫入預設關閉（`mcpWriteEnabled=false`），權杖的權限也不能修改。要改權限，建立新的權杖並撤銷舊權杖。API 權杖本身不能建立或修改權杖。

目前使用手動設定 Bearer 標頭的客戶端，不提供 OAuth 登入或動態客戶端註冊；只支援 OAuth 的連接器不適用。秘密應放在客戶端的安全設定或環境變數，不要寫進共用專案檔案。

## 工具

| 工具 | scope | 用途 |
|---|---|---|
| `read_product` | `products:read` | 單一商品設定 |
| `list_batches` | `codes:read` | 商品批次 |
| `list_codes` | `codes:read` | 碼的資料摘要，不含秘密 |
| `list_campaigns` | `campaigns:read` | 活動設定與條件 |
| `change_code_status` | `codes:write` ＋ MCP 寫入開關 | 撤銷或恢復碼 |
| `change_campaign_status` | `campaigns:write` ＋ MCP 寫入開關 | 依目前版本變更活動狀態 |
| `issue_code` | `codes:issue` ＋ MCP 寫入開關 | 依活動條件替已註冊使用者領碼 |
| `read_credits` | `credits:read` | 額度餘額、50 筆分頁交易與來源狀態 |
| `read_entitlements` | `entitlements:read` | 限時會員或永久權益 |
| `manage_credits` | `credits:write` ＋ MCP 寫入開關 | 發放、扣除、退回、撤銷額度 |
| `redeem_code` | `codes:redeem` ＋ MCP 寫入開關 | 為指定使用者兌換碼 |

工具參數及業務規則與 [API 權杖文件](authentication.md) 相同。工具清單只包含該權杖授權的操作；每次呼叫仍檢查商品範圍，不依賴隱藏工具或提示文字作為授權。

`userId` 必須是產品後端已確認的穩定使用者識別。發碼與權益寫入需要穩定冪等鍵，重試不可產生新鍵。活動狀態操作使用 expectedVersion，版本衝突時必須重新讀取再決定；它不標記為冪等操作。工具 annotations 標記唯讀／寫入與冪等性，僅供客戶端顯示，真正授權由伺服器執行。

每個權杖與 REST API 共用每分鐘 30 次上限，包含協定初始化及工具發現。工具業務錯誤以 `isError: true` 回傳公開代碼，不回傳 SQL 或內部例外。無效權杖回 HTTP 401；商品不符在工具結果中回 `API_SCOPE_DENIED`。

有 Origin 的請求必須與 APP_URL 同源，Host 必須符合部署網址。一般原生 MCP 客戶端沒有 Origin，可以直接連線。請求上限 1 MiB，所有回應不快取。

## 相容性

伺服器遵循 MCP Streamable HTTP 傳輸，可搭配官方 SDK 客戶端使用；依賴前請先測試自己的客戶端。只接受 `POST`：`GET` 與 `DELETE` 會先驗證身分，再回 405 並附 `Allow: POST`；`Host` 與 `APP_URL` 不符的請求回 403 `INVALID_HOST`。商品／活動新增與編輯、產碼／匯入／補貨、裝置管理、直接指派及 Stripe 折扣工具規格見以下各節。

實作參考：[官方 SDK 的 Web Standard transport](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/src/server/streamableHttp.examples.ts)。

## 新增管理工具

`create_product`、`update_product`、`archive_product` 需要 products:write；建立商品額外要求全部商品權限，限定商品權杖不會顯示建立工具。`restock_batch` 需要 codes:write，使用穩定 UUID 冪等鍵與相同內容重試。所有這些工具均需 MCP 寫入開關。欄位規格同 authentication.md 的商品與補貨管理。

`create_campaign`、`update_campaign` 需要 campaigns:write 及 MCP 寫入開關；`read_campaign` 需要 campaigns:read。建立後是草稿，使用 change_campaign_status 啟用。修改需 expectedVersion，商品與批次固定；遇版本衝突先重新讀取再決定。條件 JSON 格式見 [活動條件](conditions.md)，不得引用權杖未授權商品的購買紀錄。

私密連結工具：create_claim_link、list_claim_links、revoke_claim_link。活動憑證工具：save_campaign_credential、list_campaign_credentials、revoke_campaign_credential。讀取需 campaigns:read，其他需 campaigns:write 及 MCP 寫入開關；欄位同 REST 文件。建立連結會回傳秘密 token，憑證寫入會接收秘密；僅對受信任的代理啟用，避免將秘密貼入公開對話或日誌。

`create_code_batch` 匯入實際碼清單；`generate_code_batch` 依規則安全產碼。兩者需 codes:write 及 MCP 寫入開關，並要求 UUID idempotencyKey，重試沿用相同鍵和內容。回應只含批次 id/count，不揭露碼；欄位見 REST 批次建立文件。

銷售工具 configure_sales_batch 需要 products:write；權益工具 configure_reward、read_reward 分別需要 rewards:write、rewards:read。寫入需 MCP 額外開關，權益修改需要 expectedVersion。可設定額度、限時會員、永久權益或外部發放；外部發放結果不明時由管理員核對，不能直接重送。詳細欄位見 REST 文件。

## 啟用裝置工具

`list_license_devices` 與 `release_license_device` 對應 licenses.read／licenses.release，均要求 licenses:manage 與商品授權。預設只顯示查詢工具；解除工具另要求 mcpWriteEnabled。查詢每頁 50 筆，不回傳啟用憑證或裝置指紋。裝置可能重新啟用，解除工具不宣告冪等；未知結果請先重新查詢。

`activate_license_device` 另提供產品後端／授權代理委派啟用，要求 licenses:manage、商品範圍及 mcpWriteEnabled。共用碼會檢查指定 userId 的持有關係，不接受僅知道碼的陌生帳號。回應含 activationToken，應視為秘密，不放入公開日誌。

Stripe 折扣工具：`read_stripe_discounts`／`manage_stripe_discounts` 僅對全商品權杖提供，分別需 `discounts:read`／`discounts:write`；後者仍需額外 MCP 寫入授權。輸入包在 `request`，詳見 [Stripe 折扣](stripe-discounts.md)。匯入另需 `codes:write`，解密快照可能包含碼及客戶識別，應保密。

`configure_sales_batch` 另支援可選 `allowPromotionCodes` 與 `stripeProductId`；省略保留原值，Product ID 傳 null 清除關聯。
