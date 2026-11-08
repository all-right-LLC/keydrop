# Stripe 付款整合

Keydrop 具備 Checkout、Webhook、購買／訂單頁、商品銷售設定、庫存排程及退款後的存取權審查。正式收款前，請先在 Stripe 測試模式測試所有流程；並非每條例外路徑都已涵蓋。

## 設定

每次部署只連一個 Stripe 帳戶。將 `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET` 設為 Worker secrets，不能寫進倉庫、瀏覽器或公開環境變數。免費領取與兌換不需要設定 Stripe。

Webhook URL 為 `https://<網域>/api/stripe/webhook`，至少訂閱：

- checkout.session.completed
- checkout.session.async_payment_succeeded
- checkout.session.async_payment_failed
- checkout.session.expired
- charge.refunded
- refund.created、refund.updated、refund.failed

使用與 SDK 相容的 Stripe API 版本，先以測試模式測試，再設定正式模式憑證。不要混用測試／正式簽章秘密。

Keydrop 建立一般 Checkout 時明確傳入 `managed_payments.enabled=false` 與 `automatic_tax.enabled=false`，避免帳戶預設 Managed Payments 改變賣方身分、商品稅別要求及既有金額核對規則；不修改 Stripe 帳戶全域設定。目前未實作 Managed Payments／稅額結算，不能直接開啟後沿用此履約流程。既有訂單保留原本 Checkout 請求快照，更新程式不會改寫已送出的冪等參數。

## 銷售及領取

管理員透過 `PUT /api/products/<id>/sales` 指定 `{ "batchId": "批次 UUID" }`；傳 null 停止銷售。批次必須屬於同一商品。未指定銷售批次的商品不會因為有價格就自動開放購買。

`POST /api/checkout` 接受 `productId`、UUID `idempotencyKey`。需要同站 Origin，身分由登入 session 或簽章瀏覽器 cookie 取得。匿名首次回 428 建立 cookie，應用相同冪等鍵重試；不能改用新鍵重複預留。

商品價格、貨幣、數量一及回跳網址全部由伺服器產生，不接受前端傳入金額。訂單先預留 35 分鐘，Checkout 於預留結束前一分鐘到期。Checkout 建立後，預留延長到 Session 到期後再 3 天（涵蓋 Stripe Webhook 重試），避免最後一分鐘付款或 Webhook 晚到時碼先被釋放；放棄付款的訂單在收到 `checkout.session.expired` 時立即釋放。非同步付款（Session 已完成但尚未入帳）最長保留 14 天，`checkout.session.async_payment_failed` 時釋放。

同一買家同時最多 2 筆、同一網段（IPv4 位址或 IPv6 /64）最多 5 筆 35 分鐘內建立的未付款訂單，超過回 429 `ORDER_PENDING_LIMIT`，避免匿名請求把整批庫存鎖住。建立參數保存快照並使用固定 Stripe 冪等鍵，商品後續改名不影響重試。

每個商品僅使用其設定的單一貨幣，Checkout 明確傳入 `adaptive_pricing.enabled=false`，避免帳戶預設自動換匯使實收貨幣與訂單核對規則不同。目前不支援同一訂單的換匯結算。

Checkout 回傳 `orderId` 與 Stripe `url`；已關閉的 session 回 null URL。成功及取消都回 `/orders/<id>`。該頁每三秒查詢訂單，最多自動更新一分鐘，另提供手動更新及繼續付款。不能把返回成功頁當成付款成功證明。

`GET /api/orders/<id>` 僅允許訂單買家 session／原簽章瀏覽器存取。匿名購買後即使登入，也可透過原 cookie 查看；它不會單憑相同 Email 自動變成某帳號的訂單。

## 付款及退款

Webhook 對原始內容以官方 SDK Web Crypto 驗簽，最大 256 KiB。事件 ID 去重，處理中有五分鐘租約及個別租約識別；處理失敗釋放租約供 Stripe 重試，並行請求不會直接當成已完成。

收到通知後重新向 Stripe 取得 Checkout 與 PaymentIntent，核對訂單識別、session、價格、貨幣、付款成功狀態及實收金額。延遲付款先保持未付款，成功通知後才發碼。

退款金額只累加狀態為 succeeded 的退款；pending／failed 不當作完成。缺貨且設定自動退款時，用固定冪等鍵申請剩餘款項退款。退款失敗或取消標記人工檢查，等待管理員處理。完整退款成功後按商品快照決定是否撤銷可控碼；外部平台碼只標記退款。

若退款通知先於付款通知到達，同樣重新讀取 Stripe 最新狀態，已全額退款訂單不發碼。較舊通知不能降低本機已確認退款金額。

金額使用整數轉換，支援一般零／二位及三位貨幣，並處理 ISK／UGX 相容單位。無法精確表達的金額直接拒絕，不靜默四捨五入。個別貨幣及最低金額是否可收款仍由部署者 Stripe 帳戶決定。

## 驗證與未完成項目

除官方 SDK／SQLite 測試外，已透過真實 Stripe 沙盒建立折扣付款與兩次退款，遠端 Worker 接收並處理七個付款／退款事件。未執行正式模式付款或修改 Stripe 帳戶全域設定。

已完成：購買頁、訂單頁、銷售批次設定、已購碼與裝置紀錄，以及 `/dashboard/orders` 的分頁／篩選、Stripe 核對和人工補發。

匿名訂單可在原瀏覽器登入後，於訂單頁按「Link to my account」綁定。`POST /api/orders/<id>/link` 同時驗證登入 session 與原購買瀏覽器證明，只接受已付款且未屬其他帳號的訂單。綁定後需該帳號才能查看，原 cookie 不再單獨授權；不會只憑相同 Email 認領訂單。綁定後才能將匿名購買的內建權益兌換到帳號。

缺貨三策略分別為：自動全額退款、補貨後由管理員手動交付，以及補貨後由 Cloudflare 排程自動交付原訂單。逾時未付款訂單由排程清理。延遲付款方式及外部平台的撤銷能力請依實際配置驗證。

選配 Email 交付及 Stripe Coupon／Promotion Code 雙向同步，參見[郵件文件](email.md)與[折扣文件](stripe-discounts.md)。

官方依據：[Stripe Node SDK](https://github.com/stripe/stripe-node)、[付款履約](https://docs.stripe.com/checkout/fulfillment)、[貨幣與金額單位](https://docs.stripe.com/currencies)。

## Checkout 促銷碼與實付金額

商品銷售設定可開啟 `allowPromotionCodes`（預設關閉），傳給 Stripe Checkout 的 `allow_promotion_codes`。開關連同其他建立參數保存在該訂單的 Checkout 請求中；後續修改商品只影響新 Checkout。

訂單 `amount_minor` 保留原價；`charged_minor` 保存經 Stripe 核對的實付金額，結算後不可改寫。付款核對原價小計、折扣額、總額、幣別、Session／訂單歸屬；目前不啟用稅費或運費，遇到非零稅費／運費拒絕自動結算。正額訂單仍須核對 PaymentIntent 的成功狀態、訂單 metadata 與實收金額。退款以實付金額為全額退款門檻，不能退超過實付。

100% 折扣須取得 `complete`、`paid` 或 `no_payment_required`、總額零且沒有 PaymentIntent 的 Session 才交付，並核對原始小計及全額折扣。Stripe 真實沙盒的零元完成訂單可能回傳 `paid`。依 [Stripe 零元訂單指引](https://docs.stripe.com/payments/checkout/no-cost-orders?ui=full-page)，此類訂單以 Checkout 完成事件處理，不能依賴 PaymentIntent。零元不等於退款；若缺貨策略是退款，轉為人工處理，因為沒有付款可退款；人工／補貨策略照常處理。

消費者訂單回應的 `amountMinor` 顯示實付（未結算時顯示原價），另有 `listAmountMinor` 保存原價。退款事件也包含這兩種金額。商品銷售設定 PUT 可傳 `{batchId,allowPromotionCodes}`；省略開關時保留原設定。

Checkout 預設使用內嵌商品資料；可在銷售設定填入同一 Stripe 帳戶／模式的有效 Product ID，以使用限定該商品的 Coupon。Keydrop 仍使用自己的價格快照，Stripe 商品不決定金額。建立 Checkout 前確認來源商品仍有效；商品關聯同樣固定於請求快照，重試不跟隨後續設定變動。適用性、客戶資格與兌換次數由 Stripe 判斷。請先在 Stripe 測試模式驗證。

銷售設定 PUT 另接受 `stripeProductId`（`prod_` ID 或 null）；省略保留原設定，null 清除。儲存時驗證格式，結帳時使用同一 Stripe client 讀取商品；不存在、已刪除、停用、帳戶不符或無權限時拒絕建立 Checkout，回 503 `STRIPE_PRODUCT_UNAVAILABLE`。關聯不會在 Stripe 建立或修改商品。


## 部分退款與人工存取權審查

已交付訂單收到部分成功退款後，訂單後台顯示 Review refund access。管理員填寫至少 10 字核對備註，再確認以下決定：

- Keep access：保留目前存取權，只解決這個累計退款金額的待審標記；後續退款仍按原商品快照處理。
- Revoke access：撤銷該筆訂單存取權。獨立碼會撤銷碼本身，共用碼不影響其他持有人；對應兌換沿原 reclaimOnRevoke 規則回收，已消耗部分仍需核對。外部權益只建立原發放的撤銷工作，不保證接收端已回收。
- Acknowledge review：外部平台碼或已撤銷的訂單只允許確認審查。對 App Store 等外部碼需先自行核對平台狀態；此操作不會使外部碼失效，也不會恢復已撤銷的存取權。

審查不建立、取消或修改 Stripe 退款；未交付、退款失敗或仍等待退款的訂單不提供上述存取權決策，需先處理金流／履約問題。後台顯示目前撤銷狀態與最新審查的管理員、時間、核對金額及備註；完整歷史保存在 order_refund_reviews。

POST /api/admin/orders/{id} 接受 action=review-refund、refundedMinor（頁面載入時的累計成功退款整數）、decision（retain／revoke／acknowledge）、note（10–2000 字）及 UUID idempotencyKey。只允許管理員 session 與同站 Origin，管理員身分由 session 取得。

資料庫在同一交易驗證退款金額、待審狀態、交付與碼狀態，寫入紀錄並套用決定；若權益回收失敗則全部回滾。同訂單與退款金額只允許一個決定，相同冪等請求回原收據；相同鍵換內容、過期金額或已被處理的決定回 409。新的成功退款金額會重新觸發原退款規則，舊收據重播不能清除新待審標記。

自動化測試涵蓋共用碼／裝置隔離、內建額度回收、外部撤銷排程、相反決定競爭、下游失敗回滾與部分退款後的全額自動撤銷。其他回收情境請依部署配置驗證。
