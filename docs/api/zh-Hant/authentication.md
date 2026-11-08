# API 權杖與產品整合

此介面供部署者的伺服器使用。權杖不可放在公開網頁、行動 App 安裝包或用戶端程式碼中。

## 建立及撤銷

管理員登入後可在 `/dashboard/tokens` 建立及撤銷權杖。介面預設唯讀、需選擇商品；秘密顯示一次，關閉後無法恢復。也可用 `/api/tokens`：GET 列表、POST 建立、DELETE `{ "id": "權杖 UUID" }` 撤銷。修改請求需同站 Origin。一般 API 權杖不能管理或建立其他權杖。

建立內容：`name`、`scopes`、`productIds`、可選 `expiresAt`（Unix 毫秒或 null）及 `mcpWriteEnabled`（預設 false）。商品範圍不能省略：指定非空 UUID 陣列；只有明確設定 null 才授權全部商品，包含未來新增商品。有效期限必須在未來。

建立回應的 `token` 只顯示一次，格式為 `kd_` 加上隨機秘密。資料庫只保存 SHA-256 指紋。列表不包含原始權杖或指紋。請妥善保存於部署者的秘密管理服務；遺失就撤銷後重建。

## 呼叫

`POST /api/v1/operations`，標頭為 `Authorization: Bearer <token>` 與 `Content-Type: application/json`。伺服器整合不需要瀏覽器 session。每個有效權杖每分鐘最多 30 次請求，超過回 429 `RATE_LIMITED`。上限寫在程式碼（`apps/web/src/lib/server/claim-identity.ts`），最多 30 次，要提高就得修改這段程式碼。

商品操作依各節規格提供 `productId`（可能位於 product、batch 或 campaign 中）；建立商品與全帳戶 Stripe 折扣操作不使用頂層 productId。涉及顧客權益或發碼時另提供 `userId`。`userId` 由受信任的部署者伺服器指定，是該產品中的穩定使用者識別；若要存取 Keydrop 頁面建立的權益，必須使用同一個 Keydrop 使用者 ID。不得直接相信未驗證的用戶端傳入 ID。

| action | 所需 scope | 其他欄位 |
|---|---|---|
| `products.read` | `products:read` | 無，回傳單一商品設定 |
| `batches.read` | `codes:read` | 無，列出商品批次 |
| `codes.read` | `codes:read` | 可選 `batchId`、`status`、`page`；每頁 50 筆 |
| `codes.update` | `codes:write` | `ids`（最多 1,000 個 UUID）、`change`（revoke／restore） |
| `campaigns.read` | `campaigns:read` | 可選 `page`；每頁 20 筆 |
| `campaigns.status` | `campaigns:write` | `campaignId`、`expectedVersion`、`status` |
| `codes.issue` | `codes:issue` | `userId`、`campaignId`、UUID `idempotencyKey`；可選領取條件輸入 |
| `credits.read` | `credits:read` | `bucket`、可選 `page` |
| `credits.write` | `credits:write` | `bucket`、`operation` |
| `entitlements.read` | `entitlements:read` | `plan` |
| `codes.redeem` | `codes:redeem` | `code`、UUID `idempotencyKey` |

`credits.read` 不存在的錢包回 `wallet: null`、空明細，不建立錢包。存在時包含餘額、50 筆分頁交易及可追溯來源狀態。

`credits.write` 的 `operation` 包含：

- `kind`：grant／spend／refund／revoke。
- `amount`：grant／spend／refund 為正整數；revoke 必須為 0。
- `idempotencyKey`：1–128 字元，相同錢包同鍵只執行一次；同鍵改內容拒絕。
- `relatedId`：grant 是唯一發放來源；refund 是原扣除交易 ID；revoke 是來源 grant ID；spend 必須為 null 或省略。

`credits:write` 包含發放及撤銷權限，僅交給受信任的產品後端。操作不接受任意 walletId，錢包由通過授權的商品、使用者及 bucket 共同定位，防止跨商品操作。

`codes.redeem` 沿用碼使用限制、已指派持有人、獎勵設定及原子交易。內建兌換只接受 redemption 類型，不能將外部平台碼當作已兌換。

錯誤回傳 `{"error": "<CODE>"}`，狀態碼如下。回應皆不快取。

| 狀態 | 意義 |
|---|---|
| 400 | 輸入格式不符（`INVALID_INPUT`） |
| 401 | 權杖無效、已到期或已撤銷 |
| 403 | 缺少操作或商品授權 |
| 404 | 找不到商品、活動或使用者（`PRODUCT_NOT_FOUND`、`CAMPAIGN_NOT_FOUND`、`CLAIM_USER_NOT_FOUND` 等） |
| 409 | 業務衝突，例如餘額不足或冪等鍵重用 |
| 413 | 請求本文超過 1 MiB（`REQUEST_TOO_LARGE`） |
| 415 | `Content-Type` 不是 `application/json` |
| 429 | 此權杖請求過多（`RATE_LIMITED`） |
| 503 | 缺少必要設定，例如 `CODE_ENCRYPTION_KEY`（`ENCRYPTION_NOT_CONFIGURED`）、Stripe（`STRIPE_NOT_CONFIGURED`）或資格驗證端點（`QUALIFICATION_UNAVAILABLE`） |

## 目前界線

上表列出基本讀取、發碼及權益操作，並非完整清單。`codes.assign` 與 `assignments.read` 見[直接指派](assignments.md)，`discounts.read`／`discounts.write` 見[Stripe 折扣](stripe-discounts.md)。商品管理、批次建立／補貨、活動編輯、憑證／連結、銷售／權益設定及裝置管理詳見以下各節。以上全部亦可透過 [MCP](mcp.md) 使用。

## 庫存與活動發碼

`codes.read` 只回傳碼 ID、批次、狀態、限制及使用次數，不回傳原始碼、密文或指紋。`codes.update` 僅影響 productId 內的碼；撤銷可能連動回收已設定的權益，恢復碼不自動復活已回收權益。

`campaigns.status` 接受 draft／active／paused／archived，必須帶目前版本。過時版本回 409，重新讀取後由呼叫者決定是否重試，不能盲目覆蓋。

`codes.issue` 用於受信任後端代表已註冊的 Keydrop 使用者領取活動碼。userId 必須存在，Email 及驗證狀態只從帳號資料庫讀取。所有活動資格、開放時間、私密連結、每人上限、總量及庫存限制仍有效，不是繞過條件的管理員指派。

可選領取參數包括 `linkToken`、`answers`、`passphrases`、`invitations` 與 `recoveryOnly`，語意和公開活動領取相同。相同使用者、活動及冪等鍵回同一領取結果；回應含原始碼，僅在確實需要發碼時授予 codes:issue，並避免記錄回應內容。

未知／不同商品活動回 CAMPAIGN_NOT_FOUND；未知使用者回 CLAIM_USER_NOT_FOUND；資格未滿足或庫存／上限問題回 409。外部資格服務不可用回 503。購買紀錄條件查詢 Keydrop 已確認付款且尚未全額退款的訂單；正式收款須由部署者自行設定 Stripe 並驗證。

## 商品與補貨管理

- `products.create`：`products:write` 且 `productIds: null`。輸入 `product` 含 name、slug、description、currency、priceMinor、shortagePolicy、revokeOnRefund，預設值同後台。建立不是冪等操作；slug 唯一，未知結果時先核對，不要更換 slug 盲目重建。
- `products.update`：`products:write`，輸入 productId、完整 product 設定；未提供的欄位採預設值，並非局部 PATCH。
- `products.archive`：`products:write`，輸入 productId、archived 布林值，可恢復。
- `batches.restock`：`codes:write`，輸入 productId、batchId、idempotencyKey（UUID）、codes（1–1,000 個）、可選 expiresAt、maxUses、maxDevices。批次必須屬於授權商品。原樣重試回傳同一收據，不回傳原始碼；同鍵不同內容拒絕。產碼可先在呼叫端產生安全亂數碼；此操作只接受實際碼清單。
- REST 與 MCP 本文上限為 1 MiB；超限需分批，每批使用獨立冪等鍵。大量特殊字元經 JSON 編碼仍可能觸及本文上限。

## 活動建立與修改

| action | 權限 | 輸入 |
| --- | --- | --- |
| campaigns.create | campaigns:write | campaign 完整設定；建立為 draft |
| campaigns.update | campaigns:write | campaignId、expectedVersion、campaign 完整設定 |
| campaigns.get | campaigns:read | productId、campaignId |

campaign 包含 productId、batchId、name、slug、conditions；可選 description、visibility（public/private）、authMode（anonymous/email/account）、startsAt/endsAt（毫秒或 null）、totalLimit（或 null）、perPersonLimit。省略欄位採預設值，修改並非局部 PATCH。建立 slug 必須唯一，未知結果應查詢現有活動，不要改 slug 重建。

修改必須使用最新 version，且 productId、batchId 不可變動；版本過期或來源改動回傳 CAMPAIGN_CONFLICT。跨商品查詢不回傳活動資料。條件中的 purchase.productId 也須在權杖商品範圍內。條件規格見 [活動條件](conditions.md)。

## 私密連結與活動憑證

所有操作都需 productId、campaignId；活動必須屬於授權商品。

| action | 權限 | 額外輸入／輸出 |
| --- | --- | --- |
| links.create | campaigns:write | link：expiresAt（毫秒或 null）、maxClaims（預設 1，null 不限制）；回傳 id、一次性可見 token、相對 path |
| links.read | campaigns:read | 回傳連結 ID、期限、領取上限／次數、撤銷時間；無 token 或 hash |
| links.revoke | campaigns:write | linkId；阻止後續領取，不收回已交付碼 |
| credentials.save | campaigns:write | credential：id、kind（passphrase/invitation）、secret（8–128 字元）；建立或輪替並解除該憑證撤銷 |
| credentials.read | campaigns:read | 回傳憑證 id、kind、revoked_at；無秘密或雜湊 |
| credentials.revoke | campaigns:write | credential：id、kind；撤銷憑證 |

links.create 不是冪等操作，每次成功都產生新連結；保存成功回應，不要盲目重試。path 的 token 放在 URL fragment，組合時加部署者自己的 origin；不要移到 query，也不要寫入日誌。列表不能恢復秘密，若建立回應遺失，先查列表並撤銷不確定的連結，再重新建立。

credentials.save／revoke 會更新活動版本；之後編輯活動須重新讀取 version。秘密使用密碼雜湊儲存，寫入回應僅含識別資料。這些憑證是活動口令／邀請資格，不是管理員登入憑證。

## 批次建立與產碼

`batches.create` 與 `batches.generate` 均需 codes:write、授權商品範圍、idempotencyKey（UUID）及 batch。

- create 的 batch：productId、name、kind（redemption/discount/license/external）、source（manual/import）、codes（1–1,000 個實際碼）。
- generate 的 batch：productId、name、kind（redemption/discount/license）、rules。不能自行產生外部平台的有效碼。
- 兩者可設 expiresAt、maxUses、maxDevices；預設無期限、一次兌換、一台裝置。
- rules：count（1–1,000）、prefix（最多 32 字元，英數及 `_`、`-`）、length（12–64）、alphabet（2–64 個不重複英數字元）、groupSize（0–16，0 不分段）。預設長度 20、每 5 位分段、排除易混淆字元。字元空間至少 60 bits。

回應只有批次 id 與原始 count，不包含原始碼。原碼加密保存，需要交付或管理員匯出時才解密。相同商品與 idempotencyKey 的相同有效設定重試會回傳原收據；變更內容為 BATCH_IDEMPOTENCY_CONFLICT。即使後來補貨，count 仍是首次建立數量。操作不同（create/generate）不可共用同一鍵。

管理員後台 POST /api/batches 也要求 idempotencyKey，其扁平 payload 會轉成上述共用批次操作。正規化後的預設值一致時，後台與 REST／MCP 可以取得同一收據。後台表單只在目前開啟的表單記憶體保留請求鍵；未知結果後若已關閉或重新整理，先查批次列表再決定是否重新建立。

## 銷售與權益設定

- `sales.configure` 需要 products:write，輸入 productId、batchId（同商品批次 UUID，或 null 停用銷售），以及可選的 allowPromotionCodes（Checkout 是否接受 Stripe 促銷碼）與 stripeProductId（`prod_…`，或 null 清除與 Stripe 商品的連結）。不會更改價格；價格由 products.update 設定，付款另需部署者完成 Stripe 配置。
- `rewards.configure` 需要 rewards:write，輸入 productId、batchId、可選 campaignId（預設 null）、expectedVersion 與 reward。expectedVersion=0 建立規則，之後使用讀到的版本；衝突須重新讀取，不可盲目覆蓋。
- `rewards.read` 需要 rewards:read，輸入 productId、batchId、可選 campaignId。回傳 `{rule:null}` 或 id/version/reward；指定活動時只讀該活動覆寫，不自動回退批次預設。

reward 支援：

- `{kind:"credits",bucket:"requests",amount:100}`
- `{kind:"membership",plan:"pro",days:30}`
- `{kind:"permanent",plan:"pro"}`
- `{kind:"external",integrationId:"partner",payload:{plan:"pro"}}`；接收端協定與未知結果處理見[外部權益](external-rewards.md)。

皆可加 repeat（add/replace/reject，預設 add）、reclaimOnRevoke（預設 true）。只有 redemption 批次能設定內建兌換權益；活動覆寫必須屬於相同商品與批次。修改規則僅影響未來兌換，已兌換權益保留當時快照。撤銷回收仍依原快照與可追溯消耗處理。

## 啟用裝置管理

`licenses:manage` 可對權杖授權的商品查詢、解除及委派啟用裝置；查詢不回傳啟用 token、裝置指紋或原始碼，委派啟用才返回 activationToken。

- `licenses.read`：productId、可選 codeId、page（預設 1）。回傳 devices、page、hasMore；每頁最多 50 筆，包含已解除裝置。
- `licenses.release`：productId、activationId。單一 SQL 內比對裝置所屬商品後解除，回傳 released、activationId、releasedAt。已解除且未重新啟用時重試保留原時間；不撤銷原碼或其他裝置。

裝置重新啟用會沿用 activationId。未知解除結果後，先查詢目前狀態再決定是否重試，避免解除使用者後來重新啟用的裝置。此操作屬於管理權限，不要求持有人帳號；使用者自助解除仍使用帳號所有權驗證。

## 共用碼活動分發

batches.create／batches.generate 及後台新批次支援：

- distributionMode：unique（預設，一碼只分配一次）或 shared（多人可領同碼）。
- sharedClaimLimit：每個碼跨活動、訂單的分發上限（包含有效 Checkout 預留），null 表示不加每碼上限；活動、每人及私密連結上限仍生效。

分發模式及每碼名額在批次建立後固定，補貨繼承批次設定。領取不消耗 maxUses；maxUses 仍是內建兌換次數，兩者應依用途分別設定。shared 模式的 assigned 只表示曾分配，不代表不能再分發；撤銷、過期、活動限制及每碼名額才會阻止後續領取。

共用 redemption 碼的活動權益覆寫只查本人領取紀錄；同一人從多個活動取得同碼時，使用最早具有覆寫規則的本人活動（同時間依 claim ID 固定排序）。每人同碼仍只能兌換一次。匿名領取無法建立帳號與領取的可驗證關係，共用碼匿名兌換採批次預設權益；需要活動專屬權益時請要求帳號登入。

四種共用批次可用於活動與 Checkout 銷售；共用 license 活動要求登入。shared license 已支援具名持有者與每人裝置隔離，見 licenses.md。管理員直接撤銷共用碼會影響所有持有人。

共用 Checkout 預留一個名額，不鎖住整個碼。預留逾時後名額可供其他人使用；遲到付款會重新檢查名額，依原訂單的退款／人工／補貨策略處理。已交付碼的名額不因退款重新開放，避免把已揭露碼當成未分發。

共用訂單的全額退款在 revokeOnRefund 開啟時，只撤銷該筆訂單的存取權；不撤銷共用碼。內建兌換記錄 source_order_id，按該來源回收設定允許回收的未消耗權益，其他買家不受影響。部分退款、共享外部碼與需人工處理的退款會標記審查；外部平台無法因本地撤銷而收回已公開的碼。關閉 revokeOnRefund 時保留原有持有權。

退款後訂單頁／我的碼不再揭露已撤銷持有權的碼，寄信亦重新驗證資格；已看過的共用秘密無法從使用者記憶中移除。具名免費領取與有效購買都可作為持有依據；若同時有免費領取，不把該權益歸屬於付費訂單。

licenses.activate 接受 productId、userId、code、deviceId、可選 label。userId 必須由受信任產品後端驗證後委派；共用碼仍檢查實際持有關係。詳細流程與憑證處理見 licenses.md。
