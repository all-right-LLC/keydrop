<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/web/public/brand/keydrop-wordmark-dark.svg">
    <img src="apps/web/public/brand/keydrop-wordmark.svg" alt="Keydrop" width="320">
  </picture>
</p>

<p align="center"><a href="README.md">English</a> · <b>繁體中文</b> · <a href="README.zh-Hans.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ko.md">한국어</a> · <a href="README.it.md">Italiano</a> · <a href="README.de.md">Deutsch</a> · <a href="README.ar.md">العربية</a></p>

**給獨立開發者的自架式兌換碼發放工具。** 在你自己的 Cloudflare 帳戶上管理和發放兌換碼、折扣碼、授權金鑰和 App Store 促銷代碼——免費領取活動、Stripe 結帳、權益、API、Webhook 和 MCP 伺服器，全都包在一個輕巧的 Next.js 應用裡。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fall-right-LLC%2Fkeydrop%2Ftree%2Fmain%2Fapps%2Fweb)

[![CI](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml/badge.svg)](https://github.com/all-right-LLC/keydrop/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)

> **狀態：** 1.0 之前的版本。核心流程已能在 Cloudflare 上完整跑通，但 1.0 之前可能會有不相容的變更。用在正式銷售之前，請先在自己的環境測試。

## 為什麼選 Keydrop

你做好了一款 App，手上有一份促銷代碼試算表、幾百組授權金鑰和一個 Stripe 帳戶。Keydrop 幫這些碼找個家：

- **各種碼集中在同一個庫存** —— 產生碼、從 CSV／Excel 匯入（App Store 優惠代碼、合作夥伴金鑰、Stripe 促銷代碼），並以加密方式儲存。
- **想怎麼發就怎麼發** —— 附資格條件的公開或私人領取頁、透過 Stripe 付費結帳、直接指派、Email 發放，或是適合手機操作的 *Quick handout* 頁面，在聊天中隨手把碼交給別人。
- **誰拿了什麼一清二楚** —— 每一筆領取、訂單、發放和兌換都有紀錄；撤銷碼、回收權益和處理退款都不會遺失歷史。
- **串進你的產品** —— 可限定權限的 API 權杖、REST API、簽章 Webhook 和 MCP 伺服器，讓你的後端或 AI 代理發放和查驗碼。
- **完全自己掌控** —— MIT 授權、單一管理員，部署到你自己的 Cloudflare Workers + D1。沒有託管服務，也不按碼收費。

## 功能

**碼與庫存**
- 四種碼：兌換碼、折扣碼、授權碼（線上啟用，可限制每台裝置）以及外部平台碼
- 產生、匯入（.xlsx／CSV，可對應欄位並預覽），以及同步 Stripe 促銷代碼
- 以 AES-GCM 加密儲存、精確比對搜尋、匯出、撤銷／還原、到期日及每個碼的使用次數上限
- 一次性碼或共用碼，共用碼的領取上限可跨活動和銷售計算

**發放**
- 領取活動：公開或私人連結，匿名／驗證信箱／限帳戶，每人和總量上限，可巢狀 AND／OR 的資格條件（時間區間、通關密語、邀請、購買紀錄、你自己的 HTTP 檢查）
- Stripe Checkout：每次購買一個碼、折扣、可連帶撤銷碼的退款，以及三種缺貨策略（退款、人工補發、補貨後自動發碼）
- 直接指派，以及 Email 發放給還沒有帳戶的人
- **Quick handout** —— 手機優先的頁面，取一個碼、分享出去（包括在裝置上繪製的三款分享圖卡），並記下給了誰；可加到主畫面

**獎勵與權益**
- 內建會員資格（限時或永久）和額度帳本，提供冪等的扣除／退回 API
- 重複獲得獎勵時可選擇累加、覆蓋或拒絕；碼被撤銷時回收尚未使用的權益
- 外部獎勵送到你自己的服務，結果不明時改為人工審核

**整合**
- REST API 和 MCP 伺服器，搭配細分權限、限定產品的權杖（MCP 預設唯讀）
- 附簽章的對外 Webhook，失敗會重試
- 可選用 Cloudflare Email Sending，用於驗證碼登入、寄碼郵件和管理員通知

**管理後台**
- SaaS 風格的控制台，有活動圖表、⌘K 指令面板、淺色／深色主題和手機版面，使用 [beUI](https://beui.dev) 元件打造
- 介面支援 English、简体中文、繁體中文、日本語、한국어、Italiano、Deutsch 和 العربية（支援由右到左）；語言會依訪客的瀏覽器設定，也可以隨時切換

## 技術架構

[Next.js](https://nextjs.org)（App Router）透過 [OpenNext](https://opennext.js.org/cloudflare) 跑在 [Cloudflare Workers](https://workers.cloudflare.com) · [Cloudflare D1](https://developers.cloudflare.com/d1/) · [Better Auth](https://better-auth.com) · [Stripe](https://stripe.com)（選用） · [next-intl](https://next-intl.dev) · [beUI](https://beui.dev) + Tailwind CSS

## 快速開始

### 部署到 Cloudflare

1. 點上方的 **Deploy to Cloudflare**。Cloudflare 會把 `apps/web` 資料夾複製到你 GitHub 帳戶下的新倉庫，並建立一個 Worker 和一個 D1 資料庫。
2. 填入它要求的設定：

   | 名稱 | 填寫內容 |
   |---|---|
   | `APP_URL` | 網站的 HTTPS 來源，例如 `https://keydrop.your-subdomain.workers.dev`（結尾不加斜線） |
   | `ADMIN_EMAIL` | 唯一管理員的 Email 地址 |
   | `BETTER_AUTH_SECRET` | 一組隨機密鑰，例如 `openssl rand -hex 32` |
   | `SETUP_SECRET` | 另一組隨機密鑰，在初始化頁面使用一次 |
   | `CODE_ENCRYPTION_KEY` | 64 個十六進位字元，例如 `openssl rand -hex 32` —— **務必備份；遺失後既有的碼將無法讀取** |

   每組密鑰都要用不同的值。建置指令留空，部署指令設為 `pnpm run deploy`。
3. 開啟 `APP_URL/setup`，輸入 `SETUP_SECRET` 並設定管理員密碼。接著登入，建立你的第一個產品。

免費的核心功能（碼、活動、領取）不需要其他設定。之後需要時再加上 Stripe 和 Email Sending。

### 在本機執行

需要 Node.js 24 以上和 pnpm。

```sh
cd apps/web
pnpm install --frozen-lockfile
node scripts/create-local-env.mjs "$HOME/.config/keydrop/local.env" you@example.com
pnpm run db:migrate
KEYDROP_DEV_ENV_FILE="$HOME/.config/keydrop/local.env" pnpm dev
```

開啟 <http://localhost:3000/setup>，使用產生的檔案裡的 `SETUP_SECRET`（檔案放在倉庫外，內容不會印到終端機）。

### 手動部署

```sh
cd apps/web
pnpm exec wrangler login
pnpm exec wrangler d1 create keydrop   # 把資料庫 ID 填進 wrangler.jsonc
# 在 wrangler.jsonc 設定 Worker 名稱、APP_URL 和 ADMIN_EMAIL，然後：
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put SETUP_SECRET
pnpm exec wrangler secret put CODE_ENCRYPTION_KEY
pnpm run deploy                        # 建置、套用 D1 遷移並部署
```

## 設定

| 設定 | 類型 | 必填 | 用途 |
|---|---|---|---|
| `APP_URL`, `ADMIN_EMAIL` | var | 是 | 公開來源網址和管理員 Email |
| `BETTER_AUTH_SECRET`, `SETUP_SECRET`, `CODE_ENCRYPTION_KEY` | secret | 是 | 工作階段與身分雜湊、一次性初始化、碼加密 |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | secret | 銷售時 | Stripe Checkout 和位於 `/api/stripe/webhook` 的 Webhook |
| `EMAIL` binding + `EMAIL_FROM` | binding / var | 寄信時 | Cloudflare Email Sending：驗證碼登入、寄碼郵件、管理員通知 |
| `WEBHOOK_SECRETS` | secret | 使用 Webhook 時 | 對外 Webhook 的簽章密鑰 |
| `ELIGIBILITY_SECRETS`, `EXTERNAL_REWARD_SECRETS` | secret | 選用 | 你自己的資格檢查和外部獎勵接收端的簽章密鑰 |

Cron 觸發器每五分鐘執行一次，處理預留到期、補發缺貨訂單、寄送排隊中的郵件和投遞 Webhook。修改 `wrangler.jsonc` 後請執行 `pnpm run cf-typegen`。

功能開關（公開頁面、「My codes」、管理員通知信）在 `apps/web/src/config/site.ts`；品牌和所有文案在 `apps/web/messages/<locale>.json`。

## 打造成你自己的版本

一般部署會改到的東西，都集中在少數幾個檔案。把修改留在這些地方，之後比較容易合併上游的更新。

| 想改的東西 | 位置（在 `apps/web/` 底下） |
|---|---|
| 品牌名稱、首頁和頁面文案、郵件內容 | `messages/<locale>.json`：`common.brand`、`home`、`publicSite`、`email`（每個要上線的語言都要改同一個鍵） |
| 首頁區塊和順序、選用的公開頁面、「My codes」和管理員通知開關 | `src/config/site.ts` |
| 頁尾「Powered by Keydrop」連結與 GitHub 連結（MIT 不強制，可關閉） | `src/config/site.ts`: `poweredBy.enabled`, `publicSite.repositoryUrl` |
| 首頁版面和視覺 | `src/components/site/landing/sections.tsx`、`src/components/site/landing/hero-visual.tsx`、`src/app/page.tsx` |
| 功能介紹頁和選用頁面（文件、定價、示範、更新紀錄） | `src/app/features/page.tsx`、`src/app/[section]/page.tsx` |
| 標誌、favicon 和 App 圖示 | `src/components/site/brand-logo.tsx`、`public/brand/`、`public/favicon.svg`、`src/app/favicon.ico`、`public/icons/`、`public/handout.webmanifest` |
| 顏色和淺色／深色主題 | `src/app/globals.css`（`:root` 的設計變數和 `--brand-accent`） |
| 社群分享圖 | 每次建置時由 `scripts/generate-share-image.mjs` 用字標和 `home` 文案自動產生 |
| 介面語言 | `src/i18n/locales.ts`，加上 `messages/` 裡每個語言各一個檔案 |
| Worker 名稱、公開網址、cron 排程、綁定 | `wrangler.jsonc`（改完請執行 `pnpm run cf-typegen`） |

商品、價格、活動、資格規則、寄信和 API 權杖都在控制台管理，不必改程式碼。

以下這些請確定知道原因再改：`migrations/`（只新增檔案，不要修改既有的）、`src/lib/server/`（驗證、加密、付款和庫存規則），以及 `src/components/motion/`（beUI 元件，請從上游更新）。

## 文件

完整指南在 [`docs/api`](docs/api/README.md)，提供 **English**、[繁體中文](docs/api/zh-Hant/README.md) 和 [简体中文](docs/api/zh-Hans/README.md)：

- [部署、備份與還原](docs/api/zh-Hant/deployment.md) · [本機開發](docs/api/zh-Hant/development.md) · [客製化與管理後台](docs/api/zh-Hant/customization.md)
- [驗證與 API 權杖](docs/api/zh-Hant/authentication.md) · [MCP](docs/api/zh-Hant/mcp.md) · [Webhooks](docs/api/zh-Hant/webhooks.md)
- [活動條件](docs/api/zh-Hant/conditions.md) · [資格檢查 hook](docs/api/zh-Hant/eligibility.md) · [權益與額度](docs/api/zh-Hant/entitlements.md) · [授權](docs/api/zh-Hant/licenses.md)
- [Stripe](docs/api/zh-Hant/stripe.md) · [Stripe 折扣](docs/api/zh-Hant/stripe-discounts.md) · [Email](docs/api/zh-Hant/email.md) · [Quick handout](docs/api/zh-Hant/handouts.md)

## 翻譯

介面內建八種語言。公開頁面也有各語言的網址，例如 `/ja/features`，並搭配對應的 `hreflang` 標籤和 sitemap 項目；郵件則以每位收件人的語言寄出。每個語言是 [`apps/web/messages`](apps/web/messages) 裡的一個 JSON 檔，鍵值和 `en.json` 完全相同；有測試會檢查每份翻譯的鍵值和 ICU 參數是否一致。要新增語言，把語言代碼加進 [`src/i18n/locales.ts`](apps/web/src/i18n/locales.ts)，再建立對應的 JSON 檔。非常歡迎母語人士協助修正。

## 開發

```sh
cd apps/web
pnpm run lint
pnpm run typecheck
pnpm test                # 對真實 SQLite + 遷移執行單元與整合測試
pnpm run build:worker    # 正式環境 Worker 建置
```

CI 會在 Node.js 24 和 26 上執行相同的檢查，另外從全新的本機 D1 環境端到端跑一次領碼流程。提出 pull request 前請先看 [CONTRIBUTING.md](CONTRIBUTING.md)，回報安全漏洞請見 [SECURITY.md](SECURITY.md)。

## 授權

[MIT](LICENSE) © all right LLC。內附的 [beUI](https://beui.dev) 元件保留其上游的 MIT 授權（[`apps/web/vendor/beui.LICENSE`](apps/web/vendor/beui.LICENSE)）。

## 致謝

Keydrop 建立在以下這些專案之上。感謝所有打造和維護它們的人：

- [Next.js](https://nextjs.org) 和 [React](https://react.dev)：應用程式框架
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)、[Cloudflare Workers、D1](https://developers.cloudflare.com/) 和 [Wrangler](https://developers.cloudflare.com/workers/wrangler/)：託管、資料庫和部署
- [Better Auth](https://better-auth.com)：登入、工作階段和 Email 一次性驗證碼
- [Stripe](https://github.com/stripe/stripe-node)：付款
- [next-intl](https://next-intl.dev) 和 [FormatJS](https://formatjs.github.io)：翻譯和訊息檢查
- [beUI](https://beui.dev)、[Tailwind CSS](https://tailwindcss.com)、[Motion](https://motion.dev)、[Lucide](https://lucide.dev)、[Floating UI](https://floating-ui.com)、[TanStack Virtual](https://tanstack.com/virtual)、[next-themes](https://github.com/pacocoursey/next-themes)、[clsx](https://github.com/lukeed/clsx) 和 [tailwind-merge](https://github.com/dcastil/tailwind-merge)：使用者介面
- [Zod](https://zod.dev)：輸入驗證
- [Kysely](https://kysely.dev) 和 [kysely-d1](https://github.com/aidenwallis/kysely-d1)：Better Auth 的資料庫存取
- [Model Context Protocol TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)：MCP 伺服器
- [SheetJS](https://sheetjs.com)：Excel 匯入
- [Geist](https://vercel.com/font) 和 [Poppins](https://fonts.google.com/specimen/Poppins)：介面和標誌使用的字體
- [Vitest](https://vitest.dev)、[TypeScript](https://www.typescriptlang.org) 和 [ESLint](https://eslint.org)：測試和開發工具
