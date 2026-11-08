# 管理員直接指派

商品碼庫可選取一個碼，按「Assign selected code」，填寫既有帳號 Email 與內部備註。此操作不需要活動或付款，不略過庫存、有效期、來源同步及商品封存檢查。未註冊的收件人須先建立帳號；輸入 Email 不會自動註冊使用者或假設信箱已驗證。

收件人會在「我的碼」看見「Assigned by administrator」。已驗證收件人沿用自動寄碼佇列；未設定 Email 時仍可在網站查看。未驗證信箱不會寄碼，驗證後排程可補入。

## 管理端 API

POST /api/assignments 需要管理員 session 與同站 Origin，JSON：

```json
{
  "productId": "商品 UUID",
  "codeId": "碼 UUID",
  "email": "recipient@example.com",
  "note": "客服補發原因",
  "idempotencyKey": "每次指派固定的 UUID"
}
```

回傳 id、productId、codeId、userId、createdAt，不回傳明文碼。相同管理員／冪等鍵與內容重送回原紀錄；同鍵更換內容回 ASSIGNMENT_CONFLICT。瀏覽器遇到結果不明會保留原請求並提供重試，不得把尚未確認的結果當成失敗而任意重發。

GET /api/assignments?productId=UUID&page=1 提供每頁 25 筆紀錄、page 與 hasMore。包含碼 ID、收件帳號、目前 Email、管理員 ID、API 權杖 ID（直接後台操作為 null）、內部備註、時間與碼狀態；僅管理員 session 可查詢。Email 是帳號目前的信箱，不是永久保留的地址副本。

## API Key 與 MCP

POST /api/v1/operations 使用 Bearer API 權杖：

- `codes.assign`：在上述 JSON 加入 `action: "codes.assign"`，需 `codes:issue` 與該商品範圍。這是管理性直接分配，不執行活動資格判斷；活動發碼仍使用 `codes.issue`。
- `assignments.read`：傳入 action、productId、page，需 `codes:read` 與該商品範圍。結果包含收件 Email 與內部備註，應保密。

MCP 對應 `assign_code`、`list_code_assignments`。寫入工具還需要權杖的 MCP 寫入開關，預設不提供。相同權杖、UUID 與內容在 API／MCP 間重送回同一紀錄；不同權杖的 UUID 分開計算，不會互相取回結果。撤銷或到期的權杖不能重送；新指派提交時資料庫會再檢查權杖與商品權限。

紀錄的 assigned_by 表示此單管理員部署的授權者，api_token_id 表示實際使用的委派權杖。不回傳權杖秘密或碼明文。

## 庫存與權益

- 獨立碼僅能指派尚未被保留、分配或使用的可用碼，不能覆寫已有持有人。
- 共用碼的指派、活動領取、付款保留與交付共用名額。相同帳號已持有該碼時不再消耗指派名額。
- 指派、庫存狀態、Webhook 事件在同一資料庫交易中完成；不建立假的付款或活動紀錄。
- 兌換使用批次預設權益規則；不套用其他活動的規則。獨立碼只有指定帳號能兌換；共用啟用碼依持有人隔離裝置。
- 碼庫的撤銷／恢復仍作用於整個碼，共用碼會影響所有持有人；指派紀錄不可直接編輯，不提供個別指派的轉讓或撤回。

`code.assigned` Webhook 資料包含 assignmentId、codeId、userId，不包含明文碼、Email 或內部備註，沿用既有訂閱、簽章與重試協定。

`note` 為必填，長度 1–1000 字元。錯誤：

| 狀態 | 代碼 | 意義 |
|---|---|---|
| 404 | `ASSIGNMENT_USER_NOT_FOUND` | 找不到該收件人的帳號 |
| 409 | `ASSIGNMENT_UNAVAILABLE` | 該碼無法指派，例如已指派給這個帳號、已使用、已撤銷或已到期 |
| 409 | `ASSIGNMENT_CONFLICT` | 冪等鍵以不同內容重複使用 |
