# 線上軟體授權

建立 `license` 類型碼批次，設定裝置數，並可選擇固定到期日（`expiresAt`）。獨立碼持有碼即可啟用；共用碼另要求具名持有關係，裝置上限按每個帳號分開計算。啟用碼與 activationToken 都應視為憑證；裝置 ID 本身不是授權證明。

## 共用端點

POST `/api/licenses`，Content-Type 為 `application/json`。原生應用或伺服器可不帶 Origin；瀏覽器僅接受本實例 Origin。每 IP 每分鐘最多 30 次，超限回 429。請求／回應均不得寫進產品日誌。

啟用：

```json
{"action":"activate","input":{"productId":"商品 UUID","code":"啟用碼","deviceId":"產品提供的穩定裝置 ID","label":"使用者可辨識的裝置名稱"}}
```

回應包含 `activationId`、`activationToken`、`expiresAt`。相同裝置重試回傳相同有效憑證；最大裝置數在資料庫交易內檢查。原始裝置 ID 只用來產生 HMAC，不存進資料庫。憑證加密儲存並另存查驗摘要。

查驗或解除：

```json
{"action":"validate","input":{"productId":"商品 UUID","activationToken":"啟用回傳的憑證","deviceId":"相同裝置 ID"}}
```

`validate` 回傳 `valid`、`activationId`、`expiresAt`。把 action 改成 `release` 可解除綁定。必須同時提供正確商品、憑證及裝置 ID；不能僅靠裝置 ID 解除。解除後再啟用會換發憑證，舊憑證失效。

碼撤銷、到期、裝置解除或商品封存會令查驗失效；恢復碼後，未解除且未到期的既有裝置可再次有效。這是線上驗證，不提供離線授權保證；產品應自行決定合理的重新查驗週期與暫時斷線體驗。

## 網頁持有人與管理員

登入領取碼的使用者可在「我的碼」查看裝置並解除。DELETE `/api/license-devices`，body 為 `{ "activationId": "UUID" }`，必須通過 session 與 Origin 驗證。一般使用者必須是對應碼的領取持有人；管理員可解除任意裝置。匿名領取後不會自動轉移成登入帳號持有，仍可用產品中的裝置憑證解除。

共用碼的裝置清單和自助解除以裝置自己的帳號為準，不因兩人持有同一碼而看到或操作彼此裝置。管理員或具 licenses:manage 權限的商品範圍權杖可查詢／解除授權範圍內的裝置。

## 共用碼啟用

共用 license 活動必須登入帳號領取，即使活動原本選了匿名模式，公開頁仍顯示需要登入。訪客付款可先購買，再透過原瀏覽器的訂單頁登入並連結訂單。只有已登入且持有有效領取／購買的帳號能啟用，知道共用碼本身不夠。

整合方式：

1. Keydrop 網站同站 session：呼叫上述 `/api/licenses` activate，伺服器從 Better Auth session 取得帳號；input 不接受 userId。
2. 產品後端委派：用保存在伺服器的 API Key 呼叫 POST `/api/v1/operations`，具 licenses:manage 與商品權限。傳 `{action:"licenses.activate",productId,userId,code,deviceId,label}`。產品後端須先驗證自己的使用者並映射到 Keydrop 帳號，不可把後端權杖放在用戶端或接受未驗證的 userId。
3. MCP `activate_license_device` 使用相同輸入，另要求 mcpWriteEnabled；返回 activationToken，代理及工具日誌須保密。

沒有有效持有關係回 LICENSE_OWNER_REQUIRED。啟用成功後，原生產品可用 activationToken＋deviceId 呼叫 validate／release，不需要持續攜帶登入 session 或管理權杖。同一裝置 ID 在不同帳號下形成不同綁定和憑證，裝置 HMAC 使用明確分隔的帳號／碼／裝置資料。

全額退款且開啟撤銷時，失去最後有效持有來源的帳號會被解除裝置，其他持有人不受影響。如果該帳號仍有免費領取或另一筆有效購買，裝置保留。退款後再次取得持有資格並啟用時會換發 token，避免舊 token 因重新購買而復活。獨立碼的既有裝置不必補綁帳號。

## 後台裝置管理

商品頁的 License devices 入口提供分頁裝置清單，每頁最多 50 筆，可按 Code ID 篩選。桌面使用表格，窄螢幕使用卡片；顯示裝置標籤、啟用識別、碼識別、具名帳號（如有）、綁定／碼狀態及最近啟用時間，不回傳原始裝置 ID、裝置雜湊或啟用憑證。

GET `/api/admin/license-devices?productId=UUID&page=1&codeId=UUID`，codeId 可省略；限管理員 session，回應包含 devices、page、hasMore，禁止快取。

DELETE 同一端點，JSON 為 `{ "productId": "UUID", "activationId": "UUID" }`。需管理員 session 與同站 Origin；商品與裝置必須相符。相同解除請求重送保留原解除時間。介面要求確認指定裝置，成功後更新清單；解除只讓該裝置的啟用憑證失效，不撤銷原碼或影響其他裝置。碼仍有效且有名額時，持有人可以再次啟用並取得新憑證。

## 限制

授權端點的請求必須是 JSON，且不超過 4 KiB。Keydrop 以 Cloudflare 加上的 `cf-connecting-ip` 標頭識別呼叫者；缺少此標頭時（例如未經 Cloudflare 直接呼叫 Worker），端點回 503 `LICENSE_IDENTITY_UNAVAILABLE`。
