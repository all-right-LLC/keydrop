# 部署與備份

本文件配合 [Web 啟動說明](../../../apps/web/README.md)，說明如何把 Keydrop 部署到自己的 Cloudflare 帳戶，以及相關設定、D1 備份、還原演練與排程工作。正式上線前，請在自己的環境驗證你依賴的流程。

## 部署設定

`apps/web` 是獨立應用，包含 package.json、鎖定檔、SQL 遷移、Wrangler 設定與必要密鑰名稱範本。部署按鈕的來源網址應指向公開倉庫的 `tree/main/apps/web`；按鈕建立的倉庫以該子目錄為根，不包含外層文件。

| 設定 | 用途 |
| --- | --- |
| APP_URL | 正式 HTTPS origin，不含尾斜線；用於登入、同站檢查與郵件入口 |
| ADMIN_EMAIL | 初始化時建立的唯一管理員信箱 |
| BETTER_AUTH_SECRET | 登入、權杖及持有人索引，至少 32 字；長期保管 |
| SETUP_SECRET | 一次性初始化憑證，至少 32 字；成功初始化後不能再建立第二位管理員 |
| CODE_ENCRYPTION_KEY | 64 個十六進位字元，保護碼與收件地址；長期保管 |
| DB | D1 綁定名稱；可改資料庫名稱，但不可移除此綁定 |

選用設定可開啟額外功能，需要時再以 Worker secret（或綁定）加入：

| 設定 | 類型 | 用途 |
| --- | --- | --- |
| STRIPE_SECRET_KEY、STRIPE_WEBHOOK_SECRET | secret | 透過 Stripe Checkout 付費銷售；見 [Stripe 訂單](stripe.md) |
| STRIPE_SYNC_BATCH_SIZE | var | 每次同步處理的 Stripe 折扣物件數量；見 [Stripe 折扣同步](stripe-discounts.md) |
| EMAIL 綁定 + EMAIL_FROM | binding / var | 以 Cloudflare Email Sending 寄送登入驗證碼、碼信與管理員通知；見 [Email 與訪客綁定](email.md) |
| WEBHOOK_SECRETS | secret | 外送 Webhook 的簽章密鑰；見 [事件 Webhook](webhooks.md) |
| ELIGIBILITY_SECRETS | secret | 外部資格驗證端點使用的 Bearer 權杖；見 [外部資格驗證](eligibility.md) |
| EXTERNAL_REWARD_SECRETS | secret | 外部權益接收端的 HMAC 金鑰；見 [外部權益](external-rewards.md) |
| KEYDROP_TELEMETRY | var | 匿名安裝統計（只送一次），預設開啟；設成 `off` 即可關閉，見[使用量統計](#使用量統計) |

必要密鑰各自獨立產生。不要沿用範例值，或任意更換加密密鑰及身分索引密鑰。設定範本只包含名稱，真實值應留在私人密鑰管理工具與 Cloudflare Secrets。

`pnpm run deploy` 在建置成功後、發布之前套用遠端遷移。遷移指向 `DB`，不依賴部署者選的資料庫名稱；已有遷移不會重跑。部署腳本會同步 `WORKER_SELF_REFERENCE` 與 Worker name，並重新產生型別。

[Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fall-right-LLC%2Fkeydrop%2Ftree%2Fmain%2Fapps%2Fweb) 會在既有 Cloudflare 帳戶建立私有來源副本、全新 D1 與 Worker，並套用全部遷移。APP_URL、管理員 Email 及三項獨立密鑰需部署者填寫，管理員密碼在部署後於 `/setup` 頁面設定。

## 本機與正式環境隔離

本機 `pnpm run db:migrate` 只操作 `.wrangler` 內的模擬 D1；正式 `pnpm run db:migrate:remote` 操作 Wrangler 指定的遠端 DB。不要把正式密鑰或正式資料複製到公開 fixture。使用不同的資料庫、Stripe 測試帳戶設定及寄件設定驗證新版本。

`pnpm run preview` 使用 Workers 執行環境；`pnpm dev` 使用 Next.js 開發伺服器。通過前者的本機測試，仍需在遠端環境另行驗證。

## 資料備份

在 Web 根目錄執行，輸出放在私人目錄。匯出檔含帳號、Email、訂單與加密資料，不得提交 Git。

```sh
pnpm exec wrangler d1 export DB --remote --output /absolute/private/keydrop-backup.sql
```

另行備份該部署的密鑰及外部服務設定；SQL 不包含 Cloudflare Secrets。記錄程式版本、遷移版本、備份時間及來源資料庫 ID。若需要一致的業務快照，先停止網站寫入、排程及外部事件處理，確認沒有進行中的發放或付款作業後再備份。

## 還原演練

整理工具有自己的測試：修改後執行 `pnpm run test:restore`（需要 Python 3）。

不要直接覆寫正式資料庫。先建立獨立空白 D1，將隔離測試配置中的 DB 指向該資料庫。使用 Python 3 的整理工具產生新的匯入檔，再匯入：

```sh
python3 scripts/prepare-restore.py /absolute/private/keydrop-backup.sql /absolute/private/keydrop-restore.sql
pnpm exec wrangler d1 execute DB --remote --file /absolute/private/keydrop-restore.sql
```

Keydrop 的跨表參照可能指向匯出順序較晚的表，直接匯入原始 Wrangler SQL 會出現「no such table」。整理工具先列出所有 CREATE TABLE，再保留資料插入順序，最後還原索引、view 與 trigger，避免載入資料時觸發發碼、付款或帳本副作用。它不執行 SQL、不改原檔、不覆寫既有輸出，遇到不支援的語句會拒絕處理。只使用自己可信的 Wrangler 匯出檔。

完整 SQL 備份已包含結構與遷移紀錄，不要先對空白目標套用全部遷移再匯入。使用原版本程式及對應密鑰，確認管理員登入、原碼解密、持有紀錄、額度帳本與裝置歸屬。演練環境保持 Stripe、寄信、Webhook 與排程停用，避免重播備份中的待辦造成外部動作。測試全部通過後才安排正式切換與外部服務重新接入。

資料庫回到舊時間點不會使 Stripe 付款或外部權益自動回復；切換前必須核對備份時間後的外部事件。Cloudflare Time Travel 的保留期及限制請以該帳戶方案為準。

建議先停止來源網站的寫入與排程，再以最新備份匯入全新空白 D1，並核對資料表筆數、schema 物件、遷移紀錄、碼與領取數量。另執行外鍵及 SQLite 完整性檢查，並以原密鑰抽驗碼與裝置憑證能正確解密。

要演練切換時，可將一個隔離的 Worker 暫時綁到還原庫，使用原程式與密鑰。不給它任何外部整合秘密，移除寄信綁定並停用排程，讓演練無法寄信或呼叫你的服務。這不涵蓋備份後新外部事件的對帳；正式切換仍須按前述步驟核對外部狀態。

參考：[部署按鈕](https://developers.cloudflare.com/workers/platform/deploy-buttons/)、[D1 匯入／匯出](https://developers.cloudflare.com/d1/best-practices/import-export-data/)、[D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)。

## 排程工作

Worker 每次 Cron 觸發依序執行：Stripe 折扣刷新、外部操作隔離、訂單維護（釋放過期預留、補貨發碼）、管理員通知信、碼信入列與寄送、Email 分發、匿名碼信、Webhook 外送、外部撤銷。每個工作各自隔離錯誤：一個工作失敗（例如 `EMAIL_FROM` 格式錯誤或外部服務暫時不可用）只記錄工作名稱與錯誤訊息，後面的工作照常執行；全部跑完後這次排程會標為失敗，方便在 Cloudflare 儀表板的 Cron 事件與 Workers Logs 看到 `scheduled task <名稱> failed`。

## 使用量統計

Keydrop 是開源專案，有多少站點在使用，對專案來說是一枚小小的榮譽勳章。每個安裝在完成 `/setup` 時，會送出一次匿名請求到 `https://keydrop.allright.dev/api/telemetry`，專案網站會顯示累計數字。

- **會送出**：由你自己的資料庫產生的隨機實例 ID（不是從網域、帳號或資料推算出來的）和 Keydrop 版本號。
- **不會送出**：網站網址、Email、碼、訂單、客戶或任何其他業務資料。專案網站不儲存 IP 位址。
- **時機**：只有一次，在 `/setup` 成功後。這次送不出去時，排程工作每小時最多補送一次，直到成功為止；成功之後就不再送。不影響其他排程工作。
- **關閉方式**：在執行初始化之前，到 Workers → 你的 Worker → Settings → Variables and Secrets（或 `wrangler.jsonc`）把 `KEYDROP_TELEMETRY` 設成 `off`（也接受 `0`、`false`、`no`、`disabled`）。

程式在 `apps/web/src/lib/server/telemetry.ts`。
