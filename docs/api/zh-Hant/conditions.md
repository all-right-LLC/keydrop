# 活動條件

conditions 是 JSON 樹，每個節點有 type。群組 `{ "type": "and", "children": [...] }` 或 `or` 可巢狀；children 為 1–20 個節點，整棵樹最多 100 節點、深度 8。

| type | 其他欄位 | 意義 |
| --- | --- | --- |
| always | 無 | 不增加限制 |
| authenticated | 無 | 已登入 |
| verified_email | 無 | 已驗證信箱 |
| email | addresses：1–100 個 Email | 信箱白名單；只比對已驗證的信箱 |
| email_domain | domains：1–100 個網域 | 信箱網域白名單；只比對已驗證的信箱 |
| passphrase | credentialId | 活動口令憑證識別 |
| invitation | credentialId | 邀請憑證識別 |
| time | startsAt、endsAt 至少一個 | 毫秒時間範圍；startsAt 必須早於 endsAt，且不含 endsAt 當下 |
| purchase | productId、minimum（預設 1） | Keydrop 已付款且未全額退款的訂單數 |
| question | id、label、kind、required、options、可選 correct | 問卷與答案判定 |
| external | hookId | 部署者註冊的資格 hook 或外部 API |

question.kind 為 text、single 或 multiple。text 的 options 為空陣列，correct 若提供為字串。options 最多 30 項，每項最多 200 字元。single 的 options 至少兩項，correct 為其中一個字串；multiple 的 correct 為選項字串陣列。options 不可重複，同一棵樹的 question.id 不可重複。未提供 correct 時依必填與格式驗證，不做標準答案比對。

口令與邀請的原始值不寫入條件；須透過後台設定對應憑證。external.hookId 須事先由部署者在程式碼註冊，不接受任意 URL。購買條件經 API 管理時，其 productId 也須獲該權杖授權。

```json
{
  "type": "and",
  "children": [
    { "type": "verified_email" },
    { "type": "email_domain", "domains": ["example.com"] }
  ]
}
```

管理 API 的回應包含完整條件（可能包含問卷標準答案），只能提供給受信任的後端／代理；不可把管理權杖嵌入公開前端。公開領取頁另行產生適合訪客的問卷資料。
