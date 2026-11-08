# Stripe 折扣同步

Keydrop 可以把你的 Stripe Coupon 與 Promotion Code 讀入加密目錄、建立新的折扣、把 Promotion Code 匯入批次，以及把本機碼推送到 Stripe。每次寫入 Stripe 都記成可續行或恢復的操作。用於正式資料前，請先在 Stripe 測試模式驗證流程。

## 資料與同步

Coupon 定義折扣，Promotion Code 為可分發碼。目錄以 Stripe 帳戶、測試／正式模式、物件種類及來源 ID 隔離。呼叫端必須從伺服器憑證確認帳戶與模式，不可採信用戶端傳入範圍。

快照保存 Stripe 的適用商品、客戶／帳戶、最低金額、多貨幣、期間、次數及有效狀態。金額使用 Stripe 的最小貨幣單位，轉成 Keydrop 金額時需使用既有貨幣換算。快照加密，AAD 綁定帳戶、模式、物件 ID 與版本；列表不含原始碼、客戶詳細資料或 metadata。

每次同步先取得遞增版本，再向 Stripe 讀取。只有仍持有目前版本的回覆能提交，避免較舊請求覆寫新資料。Stripe 狀態是權威來源。失敗保留舊快照，但標記過時；不能把過時快照用於新的優惠判定。僅官方 SDK 的 resource_missing 404 轉刪除標記，權限或網路失敗不能當作刪除。

## 建立操作

建立前先保存 UUID、範圍、標準化請求雜湊及加密本文。相同 UUID 不能更換帳戶、模式或內容。請求沿用固定 Stripe 冪等鍵；Coupon 使用衍生自操作 UUID 的固定 ID。成功後永久重播原物件 ID，不再建立。

60 秒租約與 token fencing 防止同時提交或晚到結果覆寫。在首次嘗試 23 小時內可用同 ID／本文重試；超過期限轉 review，不再呼叫建立 API。Stripe 的 API v1 冪等鍵可能在至少 24 小時後清除，不能依賴它永久去重。review 可從建立歷史核對既有物件並復原；不可藉換新 UUID 盲目補發。

建立成功與目錄同步是不同步驟：即使後續同步失敗，必須保留已建立的來源 ID，再單獨補同步，不能重新建立物件。

## 查證來源

參考：[建立 Coupon](https://docs.stripe.com/api/coupons/create)、[建立 Promotion Code](https://docs.stripe.com/api/promotion_codes/create)、[冪等請求](https://docs.stripe.com/api/idempotent_requests)。

## 管理員入口

`/dashboard/stripe-discounts` 顯示連線狀態、Stripe 折扣分頁及本地目錄，支援依來源 ID 同步。此處同步到折扣目錄，不自動變成可分發碼庫；管理員可在商品碼庫頁展開 Import a Stripe promotion code，明確匯入目前商品。

`GET /api/admin/stripe-discounts` 需要管理員 session，透過同一 Stripe client 的 `/v1/account` 及 `/v1/balance` 確認帳戶 ID 與 livemode。只回傳 `{accountId,livemode}`，不保存或傳回餘額及帳戶個資；受限制金鑰需有帳戶與餘額讀取權限。

`POST /api/admin/stripe-discounts` 需要管理員 session、同源 Origin 與 JSON，最大 32 KiB。所有回應 no-store：

- `{action:"catalog",kind,page?}`：每頁 25 筆本地目錄。
- `{action:"discover",kind,cursor?}`：每頁 25 筆 Stripe 來源 ID 與有效狀態，不傳原始碼。
- `{action:"read",kind,sourceId}`：解密讀取單筆已同步快照，僅管理員可用。
- `{action:"sync",kind,sourceId,expectedScope}`：取得目前 Stripe 快照。
- `{action:"createCoupon",operationId,input,expectedScope}`、`createPromotion`：持久化建立並補同步；建立成功但同步失敗仍回傳來源 ID 與 synced=false，重試不重建。

kind 為 coupon／promotion_code。寫入動作需傳畫面先前顯示的 expectedScope，伺服器仍以認證取得的範圍為準；不匹配回 409 STRIPE_CONNECTION_CHANGED，避免更換伺服器密鑰後誤寫另一帳戶或正式模式。建立 input 使用程式中嚴格 schema；後台提供 Coupon／Promotion Code 表單，更完整公開協定仍待完成。

## 建立表單與重試

後台表單可設定百分比／固定金額、多貨幣、訂閱期間、商品限制、到期與次數；Promotion Code 可設定關聯 Coupon、客戶／帳戶、首次交易、最低消費及啟用狀態。金額欄位標示 Stripe 最小單位，日期以瀏覽器當地時間輸入再轉 Unix 秒。

目前分頁的 sessionStorage 只保存標準化請求雜湊對應的操作 UUID，不保存原始碼、客戶 ID 或憑證。同分頁重新整理後重新輸入相同帳戶／模式／值可沿用 UUID；更換分頁、清除瀏覽器資料或使用不同裝置不具備此關聯，需保留顯示的操作 ID 並核對伺服器紀錄，不能宣稱跨裝置自動去重。

建立成功後可再次檢查同一操作；只有確認成功後才顯示「用相同值另開一次建立」，供管理員明確發起不同操作。未知結果不顯示這個按鈕。服務端可依操作 ID 取回原請求重試，或核對既有物件後復原。

## 建立歷史與復原

管理頁的 Creation history and recovery 每頁 25 筆，只列出操作 ID、種類、狀態、來源 ID 及時間／次數，不傳原始請求或碼。可跨分頁／裝置在同一管理帳號查看，解決瀏覽器不再保存表單的情況。

管理員 POST 另支援：

- `{action:"operations",page?}`：列出目前連線範圍的建立日誌。
- `{action:"resume",operationId,expectedScope}`：由伺服器解密原請求後重試；成功操作只補同步；未確認操作仍受 23 小時期限限制。
- `{action:"recover",operationId,sourceId,expectedScope}`：只讀 Stripe 既有物件，確認 metadata.keydrop_operation_id、物件 ID、模式及原碼／Coupon 關聯一致才補回來源 ID，再同步目錄。Coupon 必須使用原操作衍生的固定 ID；Promotion Code 的來源 ID 由管理員從 Stripe 複製。

復原不呼叫建立 API；metadata 已移除／修改、來源已刪除、不能核對或仍有有效租約時不強行結案。操作租約及 token fencing 防止過期復原覆寫新結果。若沒有可驗證的既有物件，案件保持待確認；目前沒有宣稱可自動證明「Stripe 從未建立」的功能。

## Promotion Code 匯入碼庫

管理員 POST 可使用 `{action:"importPromotion",expectedScope,input:{productId,promotionId,name,distributionMode,sharedClaimLimit}}`。distributionMode 為 unique／shared（預設 shared），sharedClaimLimit 為 1–1,000,000 或 null。先向 Stripe 同步 Promotion Code 與關聯 Coupon，再用同交易建立 discount／stripe 批次、加密碼及來源關聯。

相同帳戶／模式／Promotion Code／商品只有一個關聯。相同匯入設定重試回傳原批次與碼 ID；設定不同回衝突。商品內已有相同文字的其他碼時不默默合併，整筆匯入回滾。來源快照在入庫前版本改變、已封存商品或來源到期亦拒絕。

Stripe 領取名額與 Stripe 兌換次數不同；碼庫畫面顯示使用次數由 Stripe 管理。Stripe 自己執行客戶、最低消費、商品、首次交易等優惠限制，匯入不會移除它們；管理員需依目標領用者配置活動資格。

後續同步若得知來源／Coupon 停用、刪除，或同步失敗／仍在途，資料庫 view 與領取／訂單守衛會阻止新分發。期限取 Coupon 與 Promotion Code 的較早值。來源恢復有效不會改動管理員手動撤銷狀態；既有交付紀錄保留。此處依本地最新同步狀態判定，已有背景週期同步，但尚未接入 Stripe 折扣事件，不保證遠端變動立即反映。

Stripe 批次不可使用一般手動補貨，避免沒有來源的碼混入；每次匯入目前建立單一 Promotion Code 的批次，批量操作逐筆建立各自批次。來源碼文字或關聯 Coupon 若意外變動，會阻止分發，不能把舊加密碼當成新來源繼續發送。


商品匯入表單先確認 Stripe 連線，再填 Promotion Code ID、批次名稱、獨立／共用模式與領取上限。成功後碼庫自動切到該批次；重複匯入同設定回到原批次。已封存商品不顯示匯入操作。正式使用前，請先在 Stripe 測試模式驗證。

## 批量匯入

管理員 POST 支援 `{action:"importPromotions",expectedScope,input:{productId,promotionIds,name,distributionMode,sharedClaimLimit}}`。promotionIds 為 1–25 個不重複來源 ID，其餘設定與單筆匯入相同。回傳 `{scope,results:[{promotionId,batchId,codeId}|{promotionId,error}]}`，HTTP 成功不代表每筆成功，呼叫端必須檢查 results。

每筆獨立提交；部分失敗或連線中斷不撤回已完成項目。用相同設定重送可取回既有關聯，不重複入庫。不要為了重試更改批次名稱或其他設定，否則已完成項目會回衝突。每筆錯誤只回安全代碼，不回 Stripe 原始錯誤。

商品表單可貼上以逗號或空白分隔的最多 25 個 ID，顯示逐筆結果。多筆成功時回到全部批次，單筆成功時切至該批次。

## 背景同步

既有每五分鐘排程預設同步最久未查詢的 20 個來源，可透過 STRIPE_SYNC_BATCH_SIZE 設定 1–100。來源包含 Coupon 與 Promotion Code，並非碼數；大量來源完整輪詢可能需數小時。單筆失敗仍輪替處理其他來源；缺少設定、連線身分查詢失敗或帳戶／模式切換會將相關來源標為不可用。排程租約避免重疊，但不保證遠端變更即時反映。

## API 權杖與 MCP

`POST /api/v1/operations` 使用既有 Bearer 權杖，提供兩個操作：

- `{action:"discounts.read",request:{action:"connection"}}`：取得帳戶 ID／模式。request 也可用上述 catalog、discover、read、operations 的相同欄位。
- `{action:"discounts.write",request:{action:"sync",kind:"coupon",sourceId:"coupon_id",expectedScope:{accountId:"acct_id",livemode:false}}}`：request 也可使用 createCoupon、createPromotion、resume、recover、importPromotion、importPromotions、exportPromotion、resumeExport。

讀取需 `discounts:read`，寫入需 `discounts:write`；兩者都要求 `productIds:null` 的全商品權杖，因 Stripe 折扣目錄是帳戶層級，不能用單一商品隔離。匯入另需 `codes:write`。權限不足時在呼叫 Stripe 前回 `API_SCOPE_DENIED`。read 快照包含解密的促銷碼及可能的客戶 ID，應視為機密，不記錄到公開日誌。

MCP 對應 `read_stripe_discounts` 與 `manage_stripe_discounts`，參數同樣包在 `request`。商品限定權杖不提供這兩個工具；寫入工具還須 `mcpWriteEnabled:true`。讀取工具不會同步本地快照，sync 是寫入操作。工具標示可能存取外部 Stripe；建立、重試與復原仍受原有操作 UUID、帳戶／模式及未知結果規則約束。

`discounts.write` 本身不會自動包含讀取權限，代理通常需另外授予 `discounts:read` 來取得連線範圍及查詢建立紀錄。此整合不提供 SDK。

## 既有折扣碼推送 Stripe

管理員折扣 API 及 discounts.write 的 request 可使用 exportPromotion：expectedScope 指定已確認帳戶及模式，input 包含 productId、codeId、operationId（穩定 UUID）及 promotion。promotion 使用建立促銷碼的設定，例如 couponId、maxRedemptions、客戶及最低消費限制；不接受 code，原碼由伺服器解密取得，active 只能為 true。

此操作沿用原碼與批次。先確認 Coupon，再保存加密請求及唯一推送意圖；尚未完成來源關聯時，該碼停止新的分發，既有交付紀錄保留。原碼須為本機折扣碼，未撤銷、未預留、未到期，且商品未封存。來源關聯後會依 Stripe 最新快照阻擋無效碼；原本的本機期限保留為上限。

回應包含 operationId、sourceId、codeId、batchId、linked。linked:false 表示 Stripe 已建立，但同步或本機關聯未完成；不能換新操作編號。相同設定重送沿用原操作，也可傳 `{action:"resumeExport",expectedScope,input:{productId,codeId}}`，由伺服器解密原請求恢復。

未知結果超過安全重試期限後，需透過既有 recover 核對 Stripe 物件，再 resumeExport 補關聯。目前不自動取消未知推送或解除其分發鎖。推送及恢復都要求全商品 discounts:write 加 codes:write，MCP 另需寫入授權。

商品碼庫選取一個本機折扣碼後，可使用 Push selected code to Stripe。表單先確認連線，再顯示模式與限制設定；有既存推送紀錄時提供 Resume saved request。推送成功後保留原碼與批次；恢復既存請求不會重複建立。正式使用前，請先在 Stripe 測試模式驗證。
