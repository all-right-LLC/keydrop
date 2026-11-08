# Keydrop

給獨立開發者使用的開源自架應用，在你自己的 Cloudflare 帳戶上管理與分發兌換碼、折扣碼、啟用碼。專案網站：[keydrop.allright.dev](https://keydrop.allright.dev)。

## 狀態

目前已實作登入與初始化、加密碼庫、活動領取、直接指派、權益兌換、線上啟用、Stripe 付款與折扣同步，以及 API／MCP、Webhook 和郵件佇列。原始碼已於 [GitHub](https://github.com/all-right-LLC/keydrop) 公開，採 MIT 授權。正式用於銷售前，請先在自己的環境測試你依賴的流程。

## 技術

Next.js、OpenNext、Cloudflare Workers 與 D1、Better Auth、next-intl、beUI（https://beui.dev）、Stripe（選用）。

## 本機開發

依 [Web README](../../../apps/web/README.md) 安裝依賴、產生專案外的本機設定、套用遷移，再啟動開發伺服器。
D1 設定使用本機佔位 ID。Deploy to Cloudflare 按鈕會自動建立資料庫；手動部署時，請建立自己的資料庫並把 ID 填進 wrangler.jsonc。
修改 Wrangler 設定後重新執行 `pnpm run cf-typegen`。

## 文件

- [本機開發與設定](development.md)：安裝依賴、本機設定、遷移與開發伺服器。
- [部署與備份](deployment.md)：Cloudflare 部署、資料備份與還原。
- [身分驗證與 API 權杖](authentication.md)：session、API 權杖權限與 REST 端點。
- [帳號密碼與恢復](passwords.md)：密碼設定、修改與驗證碼重設。
- [活動條件](conditions.md)：巢狀 AND／OR 條件樹格式。
- [外部資格驗證](eligibility.md)：以 HTTP 端點或程式碼 hook 判斷領取資格。
- [管理員直接指派](assignments.md)：不經活動把碼指派給既有帳號。
- [手動發放與分享圖片](handouts.md)：在手機上把碼交給沒有帳號的人。
- [Email 與訪客綁定](email.md)：寄碼佇列、匿名寄碼、信箱找回與管理員通知。
- [Stripe 訂單](stripe.md)：Checkout、付款 Webhook、缺貨策略與退款撤銷。
- [Stripe 折扣同步](stripe-discounts.md)：Coupon／Promotion Code 匯入與推送。
- [線上軟體授權](licenses.md)：裝置啟用、查驗與解除。
- [內建權益與額度帳本](entitlements.md)：會員、永久授權與額度查詢。
- [外部權益](external-rewards.md)：兌換時通知外部服務發放與撤銷權益。
- [事件 Webhook](webhooks.md)：事件類型、簽章與重試。
- [MCP](mcp.md)：給 AI 代理使用的 MCP 工具與權限。
- [公開頁面、品牌與主題客製](customization.md)：首頁、品牌、主題與介面語言。
- [第三方元件與授權](third-party.md)：beUI 等第三方元件來源與授權。
