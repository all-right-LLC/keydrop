# 外部資格整合

活動 `external` 條件使用整合 ID。部署者先在 `apps/web/src/custom/eligibility.ts` 註冊，管理員再在活動條件輸入該 ID。訪客及活動 API 不能指定 URL。

## HTTP 端點

在 `eligibilityEndpoints` 加入設定：

```ts
partner: {
  url: "https://api.example.com/keydrop/eligibility",
  secretName: "PARTNER",
  shareEmail: false,
}
```

僅可註冊自己控制的正式 HTTPS 網域；不支援 IP、內部主機、非標準埠、URL 帳密、query 或 fragment。`shareEmail` 預設關閉；開啟後也只傳已驗證的 Email。

設定 `secretName` 時，在 Worker 的 `ELIGIBILITY_SECRETS` secret 放入對應名稱到 Bearer token 的 JSON 物件。使用 `pnpm exec wrangler secret put ELIGIBILITY_SECRETS` 互動輸入，實際金鑰不寫進專案或指令歷史。本機設定沿用 `KEYDROP_DEV_ENV_FILE` 指向倉庫外密鑰檔。

請求為 POST JSON，包含 `version: 1`、`campaignId`、`productId` 與 `identity`。身分包含 `emailVerified`，訪客已登入時另含 `userId`（匿名與信箱驗證活動可能沒有 `userId`）；開啟 `shareEmail` 且信箱已驗證時才增加 `email`。程式碼 hook 則不同：它在你的部署內執行，不論 `shareEmail` 設定為何，一律收到操作者的 `email` 與 `emailVerified`。不傳 IP、瀏覽器識別、口令、邀請秘密或問卷答案。

成功回應必須是 HTTP 2xx、`application/json`：

```json
{"allowed": true, "reason": "可選，最多 500 字元"}
```

`allowed` 必須是布林值，原因不直接呈現給訪客。回應最多 16 KiB；拒絕重新導向、錯誤格式及額外欄位。整個條件判定預設最多 3 秒；網路、DNS 或整合錯誤會回傳可重試的資格暫時不可用，不會發碼。對方端點應唯讀且可重試，不應在資格檢查內扣款或消耗權益。

## 程式碼 hook

在 `eligibilityHooks` 註冊非同步函式，接收 `campaignId`、`productId`、最少身分 `actor` 及 `signal`，回傳 `{ allowed: boolean }`。hook 必須遵守取消訊號；不提供原始 IP 或瀏覽器識別。hook 與 HTTP 端點的 ID 不可重複。

## 網路邊界

發送前檢查 A／AAAA，任一非公開位址便拒絕；不跟隨重新導向。DNS 預查與 fetch 仍是兩個步驟，不能把預查宣稱為連線位址固定。部署者只能註冊自己控制、DNS 可信的端點，不可提供任意第三方 URL 編輯入口。

`global_fetch_strictly_public` 是公開路由語意，不能單靠它宣稱完整 SSRF 防護。正式部署還須驗證實際 Workers 環境的 DNS 與 fetch 行為。官方說明：[DNS API](https://developers.cloudflare.com/workers/runtime-apis/nodejs/dns/)、[Fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch/)。

資格服務明確拒絕、回覆逾時，或 HTTP 允許但程式碼 hook 拒絕時，都不會建立領取或消耗庫存。全部條件通過後只交付一個碼，成功頁重新載入不會再次呼叫資格端點或建立第二筆領取。依賴自訂 hook、網域或代理設定前，請先自行驗證。
