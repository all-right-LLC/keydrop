# 本機開發

本機開發環境支援碼庫、活動、權益、訂單及整合功能。詳細入口見 [Web README](../../../apps/web/README.md)。

需要 Node.js 24 與 pnpm。從 `apps/web` 執行：

```sh
pnpm install --frozen-lockfile
node scripts/create-local-env.mjs "$HOME/keys/keydrop/local.env" admin@example.com
pnpm run db:migrate
KEYDROP_DEV_ENV_FILE="$HOME/keys/keydrop/local.env" pnpm dev
```

## 必要設定

執行環境應提供下列變數；機密使用 Workers secrets 或安全的本機密鑰儲存，不能提交 Git。

| 變數 | 用途 |
| --- | --- |
| APP_URL | 完整 origin，不帶結尾斜線；正式環境使用 HTTPS，本機可用 http://localhost:3000 |
| ADMIN_EMAIL | 唯一管理員的 Email；公開註冊不能使用此保留地址 |
| BETTER_AUTH_SECRET | 至少 32 字元的隨機密鑰，保護登入狀態 |
| SETUP_SECRET | 至少 32 字元的獨立隨機密鑰，首次設定管理員時使用 |
| CODE_ENCRYPTION_KEY | 32 bytes 隨機值的 64 位十六進位表示，用於加密待交付碼；建立批次時必須設定 |

首頁可直接查看。第一次前往 `/dashboard` 會導向 `/setup`；輸入一次性初始化密鑰、管理員名稱與至少 12 字元的密碼，再到 `/sign-in` 登入。初始化成功後，相同密鑰不能再次建立管理員。

一般使用者與管理員共用 Better Auth，但管理權由 installation 表中的 user ID 決定，不以公開註冊或 Email 比對授予。

## 選配寄信

設定 `EMAIL_FROM` 並於 Wrangler 加入 `send_email` 綁定 `EMAIL`，依 Cloudflare Email Service 文件完成寄件網域設定；缺少任一項時不註冊 Email OTP 外掛，介面也不顯示驗證碼登入。不要為寄信修改既有收信 MX。

```json
{"send_email": [{"name": "EMAIL"}]}
```

修改 Wrangler 後執行 `pnpm run cf-typegen`。尚未設定寄信仍可使用密碼登入。

## 驗證

```sh
pnpm run test
pnpm run typecheck
pnpm run build:worker
```

測試使用記憶體 SQLite 執行真正的 migrations，驗證 Better Auth 密碼／OTP 登入、初始化回滾、管理權隔離、1,000 碼批次、重複碼回滾與加密完整性。不會寄出真實郵件或建立付款。

## 已有端點

- `POST /api/setup`：一次性管理員初始化。
- `/api/auth/*`：Better Auth。
- `GET /api/products`、`POST /api/products`：管理員商品查詢／新增。
- `GET /api/batches`、`POST /api/batches`：批次列表、產碼與入庫。
- `POST /api/batches/preview`：檢查產品內既有重複碼。
- `GET /api/codes`、`PATCH /api/codes`：分頁、批次／狀態查詢，撤銷與恢復。
- `POST /api/codes/export`：解密指定批次後匯出資料，管理介面下載為 Excel。

此清單只涵蓋核心庫存端點。其他功能在各自的文件說明端點，例如[手動發放與商品圖示](handouts.md)、[密碼](passwords.md)與 [Stripe 訂單](stripe.md)。

商品與批次寫入需管理員 session 及與 APP_URL 相同的 Origin。外部整合請使用獨立 API 權杖及 `/api/v1/operations`，不能把管理員 cookie 當作正式整合方式。

## 外部本機設定檔

若機密集中在專案外，使用 `KEYDROP_DEV_ENV_FILE=/absolute/path/to/local.env pnpm dev`。這個選項只在開發模式讀取；正式部署仍使用 Workers secrets。

匯入在瀏覽器解析 .xlsx／CSV，支援工作表、碼欄位及標頭選擇，預覽通過後才送出；每次最多 1,000 個碼。Excel 公式儲存格與可能已失真的數值碼會被拒絕。匯出 .xlsx 將碼設為文字，保留前導零且不執行公式。

精確碼查詢使用 `POST /api/codes/search` 的 JSON body（code 欄位），避免把原始碼放入網址或存取日誌。

## 登入來源 IP

Better Auth 只採用 Cloudflare 覆寫的 `cf-connecting-ip` 計算登入限流，不使用客戶端可提交的 `x-forwarded-for`。正式環境須經 Cloudflare Workers 入口；若自行改成其他反向代理，應依實際可信標頭調整，不可直接信任任意轉送標頭。純本機且沒有來源標頭的請求會使用本機／共用限流桶，不代表正式環境應停用限流。參考 [Better Auth 設定](https://better-auth.com/docs/reference/options)。

Keydrop 自己的限流與上限（領碼、寄碼、購買、授權驗證）把來源 IP 換成網段再計算：IPv4 用完整位址，IPv6 截成 /64（與 Better Auth 預設 `ipv6Subnet: 64` 一致），避免一個 IPv6 用戶換位址繞過限制。資料庫只保存 HMAC，不保存明文 IP。

匿名領取與未驗證信箱的帳號都受活動「每人上限」在每個網段的限制（帳號可無限註冊，未驗證信箱不能當成獨立的人）；已驗證信箱的帳號只看帳號本身的上限。API／MCP 的 `codes.issue` 由受信任後端代發、沒有來源 IP，不套用網段上限。


## 本機開發快取

next.config.ts 將 `experimental.turbopackFileSystemCacheForDev` 設為 false，避免開發伺服器不斷重載並重設表單輸入。正式 build 的磁碟快取保持預設。

開發伺服器亦允許 `127.0.0.1` 來源，供獨立 Cookie 的本機測試；`APP_URL` 應同步設成實際使用的 origin。`allowedDevOrigins` 只加入此本機 hostname，未開放任意來源。正式 Origin 驗證不受影響。
