# 內建權益與額度帳本

商品後台的「Entitlements & credits」提供內建會員、永久授權及額度的唯讀查詢。依精確帳號 ID 或 Email 篩選；Email 不分大小寫，API 指定的外部使用者 ID 不必對應 Keydrop 帳號。

## 後台查詢

`/dashboard/products/{productId}/entitlements` 需要管理員登入，僅查詢該商品。會員與額度列表每頁 25 筆。額度錢包明細包含每頁 50 筆交易與獨立分頁的 25 筆來源；會員來源每頁 25 筆。

會員顯示的是目前連續覆蓋的有效期間，沿用兌換服務的計算規則。撤銷較早的發放可能造成現在與未來發放之間的空檔，不能僅以最晚到期日宣稱會員有效。永久授權、被覆蓋的來源及撤銷兌換但依原設定保留的權益都會在明細呈現。

額度交易分開顯示請求金額與實際餘額變化。來源顯示原始發放、可用、已回收、已消耗未退回，以及撤銷後退回的數量。已撤銷來源不會因退回交易而恢復可用餘額；已消耗而未回收的部分會顯示提示，由管理員核對。

此頁不提供任意覆寫帳本；發放、扣除及退回沿用既有額度操作，碼撤銷及退款沿用原權益回收規則。外部產品的權益不列為內建帳本，請看[外部權益](external-rewards.md)的核對與撤銷流程。

## 管理員查詢 API

`GET /api/admin/entitlements` 使用管理員 session，不接受一般使用者或 API Key。所有回應（含錯誤）設定 `Cache-Control: no-store`。

| 查詢 | 參數 |
| --- | --- |
| 額度列表 | `productId`、`view=credits`（預設）、選填 `query`、`page` |
| 會員列表 | `productId`、`view=memberships`、選填 `query`、`page` |
| 額度明細 | `productId`、`view=wallet`、`walletId`、選填 `page`、`sourcesPage` |
| 會員明細 | `productId`、`view=membership`、`userId`、`plan`、選填 `page` |

`query` 是精確帳號 ID 或 Email，最多 254 字；不接受萬用字元搜尋。頁碼從 1 開始。列表與明細回傳 `view`、`product`、`page`、`hasMore`；額度明細另有 `sourcesPage`、`sourcesHasMore`。找不到商品、跨商品錢包或不存在的會員方案回傳 404；格式錯誤回傳 400，未登入 401，非管理員 403。

回應不含碼明文、加密內容、登入憑證或交易的自訂冪等鍵。來源 ID、操作 ID、使用者 ID 與會員來源的碼 ID 供管理員核對；僅是識別值，不是可兌換的碼。

管理員端點 `GET /api/credits?walletId=…` 與 `credits.read` 操作回傳該錢包的交易，每頁 50 筆，並附 `hasMore`。對外產品整合請使用有商品與操作範圍限制的 [API 操作](authentication.md)（亦可透過 [MCP](mcp.md) 使用）。
