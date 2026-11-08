# 手動發放（Quick handout）

給管理員在手機上把碼交給沒有 Keydrop 帳號的人，例如把 App Store 兌換碼用微信、LINE 傳給測試者或媒體，同時記下給了誰。頁面在 `/dashboard/handout`，側欄「Quick handout」、⌘K 指令面板和首頁都有入口。

## 流程

1. 選商品與批次（可選「Any batch」）。選擇只記在這台裝置的瀏覽器。
2. 按 **Take a code**：伺服器原子地挑一個可用的獨立碼（`unique` 批次），**取到就算已發放**，碼狀態改為 `assigned`，兩台裝置同時操作也不會拿到同一個碼。會先挑最早到期的碼，已過期的碼會跳過。
3. 點碼即可複製；支援系統分享的手機另有 **Share** 按鈕；**Share as image** 可產生分享圖片（見下方）。
4. 收件人、管道（WeChat、LINE、X、Email、Telegram、In person）與備註都可以留空，之後在發放紀錄補填。
5. 給錯時按 **Return to inventory** 兩次撤回：若碼沒有被兌換、領取或售出，會放回可用；已撤銷的碼維持撤銷。撤回後的紀錄不能再修改。

只有獨立碼可以手動發放；共用碼（`shared`）、已領取／售出／指派、正在預留、Stripe 來源已停用或有在途外部兌換的碼都不會被挑到。手動發放與活動、銷售共用同一個庫存，發放出去的碼不會再被領走。

## 分享圖片

三款模板：Paper（紙白格線）、Midnight（深色漸層）、Ticket（票券）。輸出 1080×1350 PNG，可加一句卡片訊息，有到期日時自動顯示「Redeem before …」。圖片在瀏覽器用 canvas 繪製，**碼不會上傳到任何伺服器**。**Save image** 直接下載；**Share image** 使用系統分享面板（iOS 可在面板中選「儲存影像」存到相簿），不支援時改為下載。

## 商品圖示

每個商品可以設定圖示（商品「設定 → 商品圖示」）。瀏覽器會把選的圖片置中裁成正方形、縮成 256 × 256，再以 WebP 上傳（不支援時用 PNG 或 JPEG）。SVG、GIF、AVIF 會先在瀏覽器轉成點陣圖，伺服器只存 PNG、WebP、JPEG。伺服器以檔頭核對宣告的類型，要求每邊 32–1024 px、不超過 256 KB，圖片存在 D1（`product_icons`，遷移 `0045`），每次上傳 `products.icon_version` 都會換新。

圖示會出現在三款分享圖片（Paper 在左上、Midnight 在標題上方置中、Ticket 壓在票券上緣）、商品列表與商品頁首、手動發放的結果與紀錄，以及公開的購買和兌換頁。圖示載入失敗時，分享圖片照常產生，只是不放圖示。

| 方法 | 路徑 | 說明 |
|---|---|---|
| `GET` | `/api/products/{id}/icon?v={version}` | 公開。回應帶 `X-Content-Type-Options: nosniff` 與 `default-src 'none'; sandbox` CSP；`v` 符合目前版本時快取一年，支援 `If-None-Match`。商品沒有圖示時回 404。 |
| `PUT` | `/api/products/{id}/icon` | 管理員、同站 Origin。本文就是圖片，`Content-Type` 為 `image/png`、`image/webp` 或 `image/jpeg`。回傳 `{version, type, width, height}`；錯誤為 400 `INVALID_IMAGE`、413 `IMAGE_TOO_LARGE`、404 `PRODUCT_NOT_FOUND`。 |
| `DELETE` | `/api/products/{id}/icon` | 管理員、同站 Origin。移除圖示（204）。 |

## 加到主畫面

頁面提供 `public/handout.webmanifest`（`start_url` 為 `/dashboard/handout`，全螢幕開啟）與 Apple Web App 設定。Android／Chrome 會出現安裝按鈕；iOS Safari 顯示「分享 → 加入主畫面」說明。圖示是 `public/icons/` 裡的靜態檔（Keydrop 的「k.」），換品牌時替換即可。

## API（管理員工作階段，需同站 Origin）

| 方法 | 路徑 | 說明 |
|---|---|---|
| `POST` | `/api/handouts` | 取碼。`{productId, batchId?, idempotencyKey, recipient?, channel?, note?}`。同一個 `idempotencyKey` 重送回同一筆，不會多佔碼；沒有可用碼回 409 `HANDOUT_UNAVAILABLE`。 |
| `GET` | `/api/handouts` | 發放紀錄，每頁 20 筆。可帶 `productId`、`query`（搜尋收件人、管道、備註）、`missingRecipient=true`、`page`。回傳含碼原文，不快取。 |
| `PATCH` | `/api/handouts/{id}` | 修改 `{recipient, channel, note}`，空字串視為清空。已撤回回 404。 |
| `DELETE` | `/api/handouts/{id}` | 撤回。 |

回應都帶 `Cache-Control: no-store`。發放紀錄存在 `code_handouts`（遷移 `0043`），資料庫觸發器保證只有初始化的管理員能發放、同一碼同時只有一筆有效發放、碼與發放者不可修改。
